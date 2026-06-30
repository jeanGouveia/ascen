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
import { metaGet, metaSet } from '../../db/localDataDb';

const META_LAST_PULL = 'sync_last_pull_at';
const META_LAST_SYNC_FAMILY_ID = 'sync_last_family_id';
const PULL_EPOCH = '1970-01-01T00:00:00.000Z';
const MAX_ATTEMPTS = 8;
const BASE_RETRY_MS = 5000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;

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

export async function pullRemoteChanges(familyId: string): Promise<void> {
  await ensurePullCursorForFamily(familyId);
  const since = await getLastPullAt();

  await Promise.all([
    pullCategories(familyId, since),
    pullTransactions(familyId, since),
    pullRecurringRules(familyId, since),
  ]);

  await setLastPullAt(new Date().toISOString());
}

async function pushOutboxItem(
  item: Awaited<ReturnType<typeof listPendingOutbox>>[0],
  familyId: string,
  userId: string | null
): Promise<void> {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;

  if (item.operation === 'delete') {
    if (item.entity === 'category') {
      await deleteCategoryRemote(item.entity_id, familyId);
    } else if (item.entity === 'transaction') {
      await deleteTransactionRemote(item.entity_id, familyId);
    } else {
      await deleteRecurringRuleRemote(item.entity_id, familyId);
    }
    return;
  }

  if (item.entity === 'category') {
    await pushCategory(payload, familyId);
  } else if (item.entity === 'transaction') {
    await pushTransaction(payload, familyId, userId);
  } else {
    await pushRecurringRule(payload, familyId);
  }
}

export async function pushLocalChanges(userId: string | null): Promise<void> {
  const familyId = await getLocalFamilyId();
  if (!familyId) return;

  const items = await listPendingOutbox();
  for (const item of items) {
    try {
      await pushOutboxItem(item, familyId, userId);
      await removeOutboxItem(item.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const attempts = item.attempts + 1;
      await markOutboxFailed(item.id, msg, attempts);
      if (attempts >= MAX_ATTEMPTS) {
        await removeOutboxItem(item.id);
        useSyncStore.getState().setLastError(`Sync falhou (${item.entity}): ${msg}`);
      }
      if (isOnlineError(msg)) throw e;
    }
  }
}

export async function runFullSync(userId: string | null): Promise<void> {
  if (syncInFlight) return;
  const familyId = await getLocalFamilyId();
  if (!familyId) return;

  syncInFlight = true;
  const store = useSyncStore.getState();
  store.setStatus('syncing');
  store.setLastError(null);

  try {
    await pushLocalChanges(userId);
    await pullRemoteChanges(familyId);
    const pending = await countPendingOutbox();
    store.setPendingCount(pending);
    store.setLastSyncAt(new Date().toISOString());
    store.setStatus(pending > 0 ? 'error' : 'idle');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.setLastError(msg);
    store.setStatus(isOnlineError(msg) ? 'offline' : 'error');
    const pending = await countPendingOutbox();
    store.setPendingCount(pending);
    throw e;
  } finally {
    syncInFlight = false;
  }
}

export function scheduleSync(userId: string | null, delayMs = 800): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void runFullSync(userId).catch(() => {
      /* estado já atualizado no store */
    });
  }, delayMs);
}

export function scheduleSyncWithBackoff(userId: string | null, attempts: number): void {
  const delay = Math.min(BASE_RETRY_MS * 2 ** attempts, 120_000);
  scheduleSync(userId, delay);
}

/** Primeira sincronização após login (ou após entrar em outra família). */
export async function initialSync(userId: string): Promise<void> {
  const familyId = await getLocalFamilyId();
  if (!familyId) return;

  const last = await metaGet(META_LAST_PULL);
  if (!last) {
    await metaSet(META_LAST_PULL, PULL_EPOCH);
  }
  await ensurePullCursorForFamily(familyId);
  await runFullSync(userId);
}
