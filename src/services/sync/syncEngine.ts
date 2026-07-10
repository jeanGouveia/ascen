import { getLocalFamilyId } from '../family';
import {
  countPendingOutbox,
  listPendingOutbox,
  markOutboxFailed,
  removeOutboxItem,
} from './outbox';
import { useSyncStore } from '../../store/syncStore';
import { pullCategories, pushCategory, deleteCategoryRemote } from './entities/categories';
import { pullTransactions, pushTransaction, deleteTransactionRemote } from './entities/transactions';
import { pullRecurringRules, pushRecurringRule, deleteRecurringRuleRemote } from './entities/recurringRules';
import { pullGoals, pushGoal, deleteGoalRemote, pushGoalDeposit } from './entities/goals';
import { metaGet, metaSet } from '../../db/localDataDb';
import { syncLog } from '../../utils/syncLogger';
import { SyncReason } from '../../types/sync';
import { logError } from '../sentry';

export interface SyncResult {
  success: boolean;
  changedEntities: {
    goals: boolean;
    categories: boolean;
    recurring: boolean;
    transactions: boolean;
  };
  durationMs: number;
}

export function hasDatabaseChanges(result: SyncResult): boolean {
  return (
    result.changedEntities.goals ||
    result.changedEntities.categories ||
    result.changedEntities.transactions ||
    result.changedEntities.recurring
  );
}

type SyncCompletionCallback = (result: SyncResult) => void;
let syncCompletionCallback: SyncCompletionCallback | null = null;

export function registerSyncCompletionCallback(callback: SyncCompletionCallback): void {
  syncCompletionCallback = callback;
}

export function unregisterSyncCompletionCallback(): void {
  syncCompletionCallback = null;
}


const META_LAST_PULL = 'sync_last_pull_at';
const META_LAST_SYNC_FAMILY_ID = 'sync_last_family_id';
const PULL_EPOCH = '1970-01-01T00:00:00.000Z';
const MAX_ATTEMPTS = 8;
const BASE_RETRY_MS = 5000;
const PULL_THROTTLE_MS = 30_000; // 30 segundos para throttle de pull

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;

function inferRunFullSyncOrigin(explicit?: SyncReason): SyncReason | 'UNKNOWN' {
  if (explicit) return explicit;
  const stack = new Error().stack ?? '';
  if (stack.includes('initialSync')) return SyncReason.INITIAL;
  if (stack.includes('scheduleSyncWithBackoff') || stack.includes('scheduleSync')) {
    return SyncReason.CRUD;
  }
  if (stack.includes('SyncStatusBar')) return SyncReason.MANUAL;
  if (stack.includes('handleAppStateChange')) return SyncReason.APP_FOREGROUND;
  if (stack.includes('handleNavigationStateChange')) return SyncReason.NAVIGATION;
  return 'UNKNOWN';
}

function formatOutboxItemSummary(
  item: Awaited<ReturnType<typeof listPendingOutbox>>[0]
): string {
  return `outboxId=${item.id} entity=${item.entity} id=${item.entity_id} operation=${item.operation} attempts=${item.attempts}`;
}

function isOnlineError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('network') || m.includes('fetch') || m.includes('failed');
}

async function getLastPullAt(): Promise<string> {
  const v = await metaGet(META_LAST_PULL);
  return v ?? '1970-01-01T00:00:00.000Z';
}

async function setLastPullAt(iso: string): Promise<void> {
  await metaSet(META_LAST_PULL, iso);
}

async function shouldRunPull(): Promise<boolean> {
  const lastPull = await getLastPullAt();
  if (!lastPull) return true;

  const elapsed = Date.now() - new Date(lastPull).getTime();
  const shouldRun = elapsed >= PULL_THROTTLE_MS;
  
  if (!shouldRun) {
    const remainingMs = PULL_THROTTLE_MS - elapsed;
    syncLog('[SYNC] pull skipped (cooldown)', `remaining=${Math.ceil(remainingMs / 1000)}s`);
  }
  
  return shouldRun;
}

async function runPullWithRetry(familyId: string, maxAttempts = 3): Promise<{
  goals: boolean;
  categories: boolean;
  recurring: boolean;
  transactions: boolean;
}> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxAttempts) {
    attempt++;
    const attemptStart = Date.now();
    try {
      syncLog('[SYNC] pull attempt', `attempt=${attempt}/${maxAttempts}`, `familyId=${familyId}`);
      const result = await pullRemoteChanges(familyId);
      console.log('[PERF] runPullWithRetry attempt', `${attempt}/${maxAttempts}`, `(${Date.now() - attemptStart}ms)`);
      syncLog('[SYNC] pull success', `attempt=${attempt}/${maxAttempts}`);
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logError(lastError, { context: 'pullRemoteChanges', attempt, maxAttempts, familyId });
      syncLog('[SYNC] pull failed', `attempt=${attempt}/${maxAttempts}`, `error=${lastError.message}`);

      if (attempt < maxAttempts) {
        console.log('[PERF] runPullWithRetry attempt', `${attempt}/${maxAttempts}`, `failed`, `(${Date.now() - attemptStart}ms)`);
        const delay = BASE_RETRY_MS * 2 ** (attempt - 1);
        syncLog('[SYNC] pull retry', `delayMs=${delay}`, `nextAttempt=${attempt + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  syncLog('[SYNC] pull exhausted', `maxAttempts=${maxAttempts}`, `finalError=${lastError?.message}`);
  throw lastError || new Error('Pull failed after retries');
}

/** Ao trocar de família, força pull completo (evita ficar só com sync incremental da família antiga). */
async function ensurePullCursorForFamily(familyId: string): Promise<void> {
  const prev = await metaGet(META_LAST_SYNC_FAMILY_ID);
  if (prev !== familyId) {
    await metaSet(META_LAST_PULL, PULL_EPOCH);
    await metaSet(META_LAST_SYNC_FAMILY_ID, familyId);
  }
}

export async function resetSyncPullCursor(): Promise<void> {
  await metaSet(META_LAST_PULL, PULL_EPOCH);
  const familyId = await getLocalFamilyId();
  if (familyId) await metaSet(META_LAST_SYNC_FAMILY_ID, familyId);
}

export async function pullRemoteChanges(familyId: string): Promise<{
  goals: boolean;
  categories: boolean;
  recurring: boolean;
  transactions: boolean;
}> {
  syncLog('[GATE] pullRemoteChanges CALLED', `familyId=${familyId}`);
  const pullStart = Date.now();
  console.log('[PERF] pullRemoteChanges START');
  await ensurePullCursorForFamily(familyId);
  const since = await getLastPullAt();
  syncLog('[SYNC] pull started', `cursor=${since}`, `familyId=${familyId}`);

  const [categories, transactions, recurring, goals] = await Promise.all([
    pullCategories(familyId, since),
    pullTransactions(familyId, since),
    pullRecurringRules(familyId, since),
    pullGoals(familyId, since),
  ]);

  await setLastPullAt(new Date().toISOString());
  syncLog('[SYNC] pull completed', `durationMs=${Date.now() - pullStart}`, `categories=${categories}`, `transactions=${transactions}`, `recurring=${recurring}`, `goals=${goals}`);
  console.log('[PERF] pullRemoteChanges END', `(${Date.now() - pullStart}ms)`);

  return { categories, transactions, recurring, goals };
}

async function pushOutboxItem(
  item: Awaited<ReturnType<typeof listPendingOutbox>>[0],
  familyId: string,
  userId: string | null
): Promise<void> {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;
  syncLog('[SYNC] push request sent', `entity=${item.entity}`, `id=${item.entity_id}`, `operation=${item.operation}`);

  if (item.operation === 'delete') {
    if (item.entity === 'category') {
      await deleteCategoryRemote(item.entity_id, familyId);
    } else if (item.entity === 'transaction') {
      await deleteTransactionRemote(item.entity_id, familyId);
    } else if (item.entity === 'recurring') {
      await deleteRecurringRuleRemote(item.entity_id, familyId);
    } else if (item.entity === 'goal') {
      await deleteGoalRemote(item.entity_id, familyId);
    }
    syncLog('[SYNC] push success', `entity=${item.entity}`, `id=${item.entity_id}`, `operation=${item.operation}`);
    return;
  }

  if (item.entity === 'category') {
    await pushCategory(payload, familyId);
  } else if (item.entity === 'transaction') {
    await pushTransaction(payload, familyId, userId);
  } else if (item.entity === 'recurring') {
    await pushRecurringRule(payload, familyId);
  } else if (item.entity === 'goal') {
    if (item.operation === 'deposit') {
      await pushGoalDeposit(item.entity_id, payload.amount as number, familyId);
    } else {
      await pushGoal(payload, familyId);
    }
  }
  syncLog('[SYNC] push success', `entity=${item.entity}`, `id=${item.entity_id}`, `operation=${item.operation}`);
}

export async function pushLocalChanges(userId: string | null): Promise<void> {
  const pushStart = Date.now();
  console.log('[PERF] pushLocalChanges START');
  const familyId = await getLocalFamilyId();
  if (!familyId) {
    syncLog('[SYNC] pushLocalChanges aborted', 'reason=noFamilyId');
    return;
  }

  const items = await listPendingOutbox();
  const entities = items.length > 0 ? [...new Set(items.map(item => item.entity))].join(',') : 'none';
  syncLog(
    '[SYNC] worker started',
    'phase=beforePush',
    `outboxCount=${items.length}`,
    `entities=${entities}`,
    ...items.map(formatOutboxItemSummary),
  );

  for (const item of items) {
    try {
      syncLog('[SYNC] processing queue item', formatOutboxItemSummary(item));
      await pushOutboxItem(item, familyId, userId);
      await removeOutboxItem(item.id);
      const remaining = await listPendingOutbox();
      syncLog(
        '[SYNC] item processed',
        formatOutboxItemSummary(item),
        `removedOutboxId=${item.id}`,
        `remainingOutboxCount=${remaining.length}`,
        `remainingIds=${remaining.map(r => r.id).join(',') || '(none)'}`,
      );
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logError(error, { context: 'processOutboxItem', item: formatOutboxItemSummary(item) });
      const msg = error.message;
      const attempts = item.attempts + 1;
      await markOutboxFailed(item.id, msg, attempts);
      if (attempts >= MAX_ATTEMPTS) {
        await removeOutboxItem(item.id);
        useSyncStore.getState().setLastError(`Sync falhou (${item.entity}): ${msg}`);
      }
      if (isOnlineError(msg)) throw e;
    }
  }
  console.log('[PERF] pushLocalChanges END', `(${Date.now() - pushStart}ms)`);
}

export async function runFullSync(userId: string | null, origin?: SyncReason): Promise<SyncResult> {
  const syncStart = Date.now();
  const resolvedOrigin = inferRunFullSyncOrigin(origin);
  console.log('[PERF] runFullSync START');
  syncLog(
    'runFullSync()',
    'phase=start',
    `origin=${resolvedOrigin}`,
    `userId=${userId ?? 'null'}`,
  );

  if (syncInFlight) {
    syncLog('[GATE] runFullSync BLOCKED', `origin=${resolvedOrigin}`, 'reason=syncInFlight');
    syncLog('runFullSync()', 'phase=aborted', `origin=${resolvedOrigin}`, 'reason=syncInFlight');
    return {
      success: false,
      changedEntities: { goals: false, categories: false, recurring: false, transactions: false },
      durationMs: Date.now() - syncStart,
    };
  }
  const familyId = await getLocalFamilyId();
  if (!familyId) {
    syncLog('[GATE] runFullSync BLOCKED', `origin=${resolvedOrigin}`, 'reason=noFamilyId');
    syncLog('runFullSync()', 'phase=aborted', `origin=${resolvedOrigin}`, 'reason=noFamilyId');
    return {
      success: false,
      changedEntities: { goals: false, categories: false, recurring: false, transactions: false },
      durationMs: Date.now() - syncStart,
    };
  }
  syncLog('[GATE] runFullSync PASSED', `origin=${resolvedOrigin}`, `familyId=${familyId}`);

  syncInFlight = true;
  const store = useSyncStore.getState();
  store.setStatus('syncing');
  store.setLastError(null);

  try {
    await pushLocalChanges(userId);
    
    let changedEntities = { goals: false, categories: false, recurring: false, transactions: false };
    
    if (await shouldRunPull()) {
      changedEntities = await runPullWithRetry(familyId);
      syncLog('[SYNC] pull executed', `origin=${resolvedOrigin}`);
    } else {
      syncLog('[SYNC] pull skipped (throttled)', `origin=${resolvedOrigin}`);
    }
    
    const pending = await countPendingOutbox();
    store.setPendingCount(pending);
    store.setLastSyncAt(new Date().toISOString());
    store.setStatus(pending > 0 ? 'error' : 'idle');
    syncLog(
      'runFullSync()',
      'phase=end',
      `origin=${resolvedOrigin}`,
      `durationMs=${Date.now() - syncStart}`,
      'result=ok',
    );
    console.log('[PERF] runFullSync END', `(${Date.now() - syncStart}ms)`);
    const result: SyncResult = {
      success: true,
      changedEntities,
      durationMs: Date.now() - syncStart,
    };
    syncLog('SYNC_CALLBACK', `goals=${result.changedEntities.goals}`, `categories=${result.changedEntities.categories}`, `transactions=${result.changedEntities.transactions}`, `recurring=${result.changedEntities.recurring}`);
    if (syncCompletionCallback) {
      syncCompletionCallback(result);
    }
    return result;
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    logError(error, { context: 'runFullSync', origin: resolvedOrigin, userId });
    const msg = error.message;
    store.setLastError(msg);
    store.setStatus(isOnlineError(msg) ? 'offline' : 'error');
    const pending = await countPendingOutbox();
    store.setPendingCount(pending);
    syncLog(
      'runFullSync()',
      'phase=end',
      `origin=${resolvedOrigin}`,
      `durationMs=${Date.now() - syncStart}`,
      'result=error',
      `error=${msg}`,
    );
    const result: SyncResult = {
      success: false,
      changedEntities: { goals: false, categories: false, recurring: false, transactions: false },
      durationMs: Date.now() - syncStart,
    };
    syncLog('SYNC_CALLBACK', `goals=${result.changedEntities.goals}`, `categories=${result.changedEntities.categories}`, `transactions=${result.changedEntities.transactions}`, `recurring=${result.changedEntities.recurring}`);
    if (syncCompletionCallback) {
      syncCompletionCallback(result);
    }
    return result;
  } finally {
    syncInFlight = false;
  }
}

export async function runPullOnly(userId: string | null, origin?: SyncReason): Promise<SyncResult> {
  const syncStart = Date.now();
  const resolvedOrigin = inferRunFullSyncOrigin(origin);
  console.log('[PERF] runPullOnly START');
  syncLog(
    'runPullOnly()',
    'phase=start',
    `origin=${resolvedOrigin}`,
    `userId=${userId ?? 'null'}`,
  );

  if (syncInFlight) {
    syncLog('[GATE] runPullOnly BLOCKED', `origin=${resolvedOrigin}`, 'reason=syncInFlight');
    syncLog('runPullOnly()', 'phase=aborted', `origin=${resolvedOrigin}`, 'reason=syncInFlight');
    return {
      success: false,
      changedEntities: { goals: false, categories: false, recurring: false, transactions: false },
      durationMs: Date.now() - syncStart,
    };
  }
  const familyId = await getLocalFamilyId();
  if (!familyId) {
    syncLog('[GATE] runPullOnly BLOCKED', `origin=${resolvedOrigin}`, 'reason=noFamilyId');
    syncLog('runPullOnly()', 'phase=aborted', `origin=${resolvedOrigin}`, 'reason=noFamilyId');
    return {
      success: false,
      changedEntities: { goals: false, categories: false, recurring: false, transactions: false },
      durationMs: Date.now() - syncStart,
    };
  }

  if (!(await shouldRunPull())) {
    syncLog('[GATE] runPullOnly BLOCKED', `origin=${resolvedOrigin}`, 'reason=throttled');
    syncLog('runPullOnly()', 'phase=skipped', `origin=${resolvedOrigin}`, 'reason=throttled');
    return {
      success: true,
      changedEntities: { goals: false, categories: false, recurring: false, transactions: false },
      durationMs: Date.now() - syncStart,
    };
  }
  syncLog('[GATE] runPullOnly PASSED', `origin=${resolvedOrigin}`, `familyId=${familyId}`);

  syncInFlight = true;
  const store = useSyncStore.getState();
  store.setStatus('syncing');
  store.setLastError(null);

  try {
    const changedEntities = await runPullWithRetry(familyId);
    store.setLastSyncAt(new Date().toISOString());
    store.setStatus('idle');
    syncLog(
      'runPullOnly()',
      'phase=end',
      `origin=${resolvedOrigin}`,
      `durationMs=${Date.now() - syncStart}`,
      'result=ok',
    );
    console.log('[PERF] runPullOnly END', `(${Date.now() - syncStart}ms)`);
    const result: SyncResult = {
      success: true,
      changedEntities,
      durationMs: Date.now() - syncStart,
    };
    syncLog('SYNC_CALLBACK', `goals=${result.changedEntities.goals}`, `categories=${result.changedEntities.categories}`, `transactions=${result.changedEntities.transactions}`, `recurring=${result.changedEntities.recurring}`);
    if (syncCompletionCallback) {
      syncCompletionCallback(result);
    }
    return result;
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    logError(error, { context: 'runPullOnly', origin: resolvedOrigin, userId });
    const msg = error.message;
    store.setLastError(msg);
    store.setStatus(isOnlineError(msg) ? 'offline' : 'error');
    syncLog(
      'runPullOnly()',
      'phase=end',
      `origin=${resolvedOrigin}`,
      `durationMs=${Date.now() - syncStart}`,
      'result=error',
      `error=${msg}`,
    );
    const result: SyncResult = {
      success: false,
      changedEntities: { goals: false, categories: false, recurring: false, transactions: false },
      durationMs: Date.now() - syncStart,
    };
    syncLog('SYNC_CALLBACK', `goals=${result.changedEntities.goals}`, `categories=${result.changedEntities.categories}`, `transactions=${result.changedEntities.transactions}`, `recurring=${result.changedEntities.recurring}`);
    if (syncCompletionCallback) {
      syncCompletionCallback(result);
    }
    return result;
  } finally {
    syncInFlight = false;
  }
}

export function scheduleSync(userId: string | null, delayMs = 800): void {
  console.log('[PERF] scheduleSync start', `userId=${userId ?? 'null'}`, `delayMs=${delayMs}`);
  syncLog('[GATE] scheduleSync CALLED', `userId=${userId ?? 'null'}`, `delayMs=${delayMs}`);
  void listPendingOutbox().then(items => {
    syncLog(
      '[SYNC] scheduleSync called',
      `userId=${userId ?? 'null'}`,
      `delayMs=${delayMs}`,
      'reason=CRUD',
      `outboxPending=${items.length}`,
      ...items.map(item =>
        `queued entity=${item.entity} id=${item.entity_id} operation=${item.operation} outboxId=${item.id}`
      ),
    );
  });

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    console.log('[PERF] scheduleSync timer fired', `userId=${userId ?? 'null'}`);
    syncLog('[GATE] scheduleSync timer fired', `userId=${userId ?? 'null'}`);
    syncLog('[SYNC] scheduleSync timer fired', `userId=${userId ?? 'null'}`);
    void runFullSync(userId, SyncReason.CRUD);
  }, delayMs);
}

export function scheduleSyncWithBackoff(userId: string | null, attempts: number): void {
  const delay = Math.min(BASE_RETRY_MS * 2 ** attempts, 120_000);
  scheduleSync(userId, delay);
}

/** Primeira sincronização após login (ou após entrar em outra família). */
export async function initialSync(userId: string): Promise<void> {
  console.log('[PERF] initialSync start', `userId=${userId}`);
  syncLog('[GATE] initialSync CALLED', `userId=${userId}`);
  const familyId = await getLocalFamilyId();
  if (!familyId) {
    syncLog('[GATE] initialSync BLOCKED', `userId=${userId}`, 'reason=noFamilyId');
    return;
  }
  syncLog('[GATE] initialSync PASSED', `userId=${userId}`, `familyId=${familyId}`);

  const last = await metaGet(META_LAST_PULL);
  if (!last) {
    await metaSet(META_LAST_PULL, PULL_EPOCH);
  }
  await ensurePullCursorForFamily(familyId);
  syncLog('[GATE] initialSync calling runFullSync', `userId=${userId}`);
  console.log('[PERF] initialSync end', `userId=${userId}`);
  void runFullSync(userId, SyncReason.INITIAL);
}
