import { supabase } from '../supabase';
import { bindNum, bindStr, bindStrNull, getDb, metaGet, metaSet } from '../../db/localDataDb';
import { getLocalFamilyId } from '../family';
import {
  countPendingOutbox,
  listPendingOutbox,
  markOutboxFailed,
  removeOutboxItem,
} from './outbox';
import { categoryToRemote, recurringToRemote, transactionToRemote } from './mappers';
import { useSyncStore } from '../../store/syncStore';
import type { DbCategory, DbRecurringRule, DbTransaction } from '../../types/database';

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

/** Aplica linha remota no SQLite (last-write-wins por updated_at). */
async function upsertLocalFromRemote(
  table: 'categories' | 'transactions' | 'recurring_rules',
  row: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const id = String(row.id);
  const remoteUpdated = String(row.updated_at ?? '');
  const deletedAt = row.deleted_at as string | null;

  if (table === 'categories') {
    if (deletedAt) {
      await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
      return;
    }
    const local = await db.getFirstAsync<{ updated_at: string }>(
      'SELECT updated_at FROM categories WHERE id = ?',
      [id]
    );
    if (local && local.updated_at > remoteUpdated) return;
    await db.runAsync(
      `INSERT INTO categories (id, name, icon, color, type, family_id, updated_at, deleted_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, COALESCE(?, datetime('now')))
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, icon=excluded.icon, color=excluded.color, type=excluded.type,
         family_id=excluded.family_id, updated_at=excluded.updated_at`,
      [
        id,
        bindStr(row.name),
        bindStr(row.icon),
        bindStr(row.color),
        bindStr(row.type),
        bindStr(row.family_id),
        remoteUpdated,
        bindStrNull(row.created_at),
      ]
    );
    return;
  }

  if (table === 'transactions') {
    if (deletedAt) {
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
      return;
    }
    const local = await db.getFirstAsync<{ updated_at: string }>(
      'SELECT updated_at FROM transactions WHERE id = ?',
      [id]
    );
    if (local && local.updated_at > remoteUpdated) return;
    await db.runAsync(
      `INSERT INTO transactions (
        id, type, amount, description, category, category_icon, category_color, category_id,
        date, payment_method, is_installment, installment_info, is_fixed, is_paid, notes,
        family_id, updated_at, deleted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, COALESCE(?, datetime('now')))
      ON CONFLICT(id) DO UPDATE SET
        type=excluded.type, amount=excluded.amount, description=excluded.description,
        category=excluded.category, category_icon=excluded.category_icon, category_color=excluded.category_color,
        category_id=excluded.category_id, date=excluded.date, payment_method=excluded.payment_method,
        is_installment=excluded.is_installment, installment_info=excluded.installment_info,
        is_fixed=excluded.is_fixed, is_paid=excluded.is_paid, notes=excluded.notes,
        family_id=excluded.family_id, updated_at=excluded.updated_at`,
      [
        id,
        bindStr(row.type),
        bindNum(row.amount),
        bindStr(row.description),
        bindStr(row.category_name),
        bindStr(row.category_icon) || '📦',
        bindStr(row.category_color) || '#6B7897',
        bindStrNull(row.category_id),
        bindStr(row.date),
        bindStr(row.payment_method) || 'Pix',
        row.is_installment ? 1 : 0,
        bindStrNull(row.installment_info),
        row.is_recurring ? 1 : 0,
        row.is_paid === false ? 0 : 1,
        bindStrNull(row.notes),
        bindStr(row.family_id),
        remoteUpdated,
        bindStrNull(row.created_at),
      ]
    );
    return;
  }

  if (deletedAt) {
    await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
    return;
  }
  const local = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM recurring_rules WHERE id = ?',
    [id]
  );
  if (local && local.updated_at > remoteUpdated) return;
  await db.runAsync(
    `INSERT INTO recurring_rules (
      id, type, description, amount, category, category_icon, category_color, category_id,
      payment_method, day_of_month, frequency, active, last_confirmed, starts_on, family_id, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      type=excluded.type, description=excluded.description, amount=excluded.amount,
      category=excluded.category, category_icon=excluded.category_icon, category_color=excluded.category_color,
      category_id=excluded.category_id, payment_method=excluded.payment_method,
      day_of_month=excluded.day_of_month, frequency=excluded.frequency, active=excluded.active,
      last_confirmed=excluded.last_confirmed, starts_on=excluded.starts_on, family_id=excluded.family_id, updated_at=excluded.updated_at`,
    [
      id,
      bindStr(row.type),
      bindStr(row.description),
      bindNum(row.amount),
      bindStr(row.category_name),
      bindStr(row.category_icon) || '📦',
      bindStr(row.category_color) || '#6B7897',
      bindStrNull(row.category_id),
      bindStr(row.payment_method) || 'Pix',
      bindNum(row.day_of_month),
      bindStr(row.frequency),
      row.active ? 1 : 0,
      bindStrNull(row.last_confirmed),
      bindStrNull(row.starts_on) ?? remoteUpdated.slice(0, 10),
      bindStr(row.family_id),
      remoteUpdated,
    ]
  );
}

export async function pullRemoteChanges(familyId: string): Promise<void> {
  await ensurePullCursorForFamily(familyId);
  const since = await getLastPullAt();

  const [catRes, txRes, recRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('family_id', familyId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('*')
      .eq('family_id', familyId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true }),
    supabase
      .from('recurring_rules')
      .select('*')
      .eq('family_id', familyId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true }),
  ]);

  if (catRes.error) throw new Error(catRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);
  if (recRes.error) throw new Error(recRes.error.message);

  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const row of (catRes.data ?? []) as DbCategory[]) {
      await upsertLocalFromRemote('categories', row as unknown as Record<string, unknown>);
    }
    for (const row of (txRes.data ?? []) as DbTransaction[]) {
      await upsertLocalFromRemote('transactions', row as unknown as Record<string, unknown>);
    }
    for (const row of (recRes.data ?? []) as DbRecurringRule[]) {
      await upsertLocalFromRemote('recurring_rules', row as unknown as Record<string, unknown>);
    }
  });

  await setLastPullAt(new Date().toISOString());
}

async function pushOutboxItem(
  item: Awaited<ReturnType<typeof listPendingOutbox>>[0],
  familyId: string,
  userId: string | null
): Promise<void> {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;

  if (item.operation === 'delete') {
    const table =
      item.entity === 'category'
        ? 'categories'
        : item.entity === 'transaction'
          ? 'transactions'
          : 'recurring_rules';
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', item.entity_id)
      .eq('family_id', familyId);
    if (error) throw new Error(error.message);
    return;
  }

  let remote: Record<string, unknown>;
  if (item.entity === 'category') {
    remote = categoryToRemote(payload, familyId);
  } else if (item.entity === 'transaction') {
    remote = transactionToRemote(payload, familyId, userId);
  } else {
    remote = recurringToRemote(payload, familyId);
  }

  const table =
    item.entity === 'category'
      ? 'categories'
      : item.entity === 'transaction'
        ? 'transactions'
        : 'recurring_rules';

  const { error } = await supabase.from(table).upsert(remote, { onConflict: 'id' });
  if (error) throw new Error(error.message);
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
