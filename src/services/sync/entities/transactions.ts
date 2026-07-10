import { supabase } from '../../supabase';
import { bindNum, bindStr, bindStrNull, getDb } from '../../../db/localDataDb';
import { transactionToRemote } from '../mappers';
import type { DbTransaction } from '../../../types/database';

export async function pullTransactions(familyId: string, since: string): Promise<boolean> {
  const startTotal = Date.now();
  const startSupabase = Date.now();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('family_id', familyId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) throw new Error(error.message);

  const supabaseTime = Date.now() - startSupabase;
  const rows = data ?? [];
  let changed = false;
  const db = getDb();
  let insertCount = 0;
  let updateCount = 0;
  let deleteCount = 0;
  const startLoop = Date.now();
  for (const row of rows as DbTransaction[]) {
    const result = await upsertTransactionLocal(row as unknown as Record<string, unknown>);
    if (result === 'inserted') insertCount++;
    else if (result === 'updated') updateCount++;
    else if (result === 'deleted') deleteCount++;
    if (result !== 'skipped') changed = true;
  }
  const loopTime = Date.now() - startLoop;
  const totalTime = Date.now() - startTotal;
  console.log('[PERF] pullTransactions', `Supabase: ${supabaseTime}ms`, `Rows: ${rows.length}`, `INSERT: ${insertCount}`, `UPDATE: ${updateCount}`, `DELETE: ${deleteCount}`, `Loop: ${loopTime}ms`, `Total: ${totalTime}ms`);
  return changed;
}

type UpsertResult = 'inserted' | 'updated' | 'deleted' | 'skipped';

async function upsertTransactionLocal(row: Record<string, unknown>): Promise<UpsertResult> {
  const startSqlite = Date.now();
  const db = getDb();
  const id = String(row.id);
  const remoteUpdated = String(row.updated_at ?? '');
  const deletedAt = row.deleted_at as string | null;

  if (deletedAt) {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    const sqliteTime = Date.now() - startSqlite;
    console.log('[PERF] upsertTransactionLocal DELETE', `${sqliteTime}ms`);
    return 'deleted';
  }

  const local = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM transactions WHERE id = ?',
    [id]
  );
  if (local && local.updated_at > remoteUpdated) return 'skipped';

  const isUpdate = Boolean(local);

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

  const sqliteTime = Date.now() - startSqlite;
  console.log('[PERF] upsertTransactionLocal', `${isUpdate ? 'UPDATE' : 'INSERT'}`, `${sqliteTime}ms`);
  return isUpdate ? 'updated' : 'inserted';
}

export async function pushTransaction(
  payload: Record<string, unknown>,
  familyId: string,
  userId: string | null
): Promise<void> {
  const remote = transactionToRemote(payload, familyId, userId);
  const { error } = await supabase.from('transactions').upsert(remote, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteTransactionRemote(entityId: string, familyId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', entityId)
    .eq('family_id', familyId);
  if (error) throw new Error(error.message);
}
