import { supabase } from '../../supabase';
import { bindStr, bindStrNull, getDb } from '../../../db/localDataDb';
import { categoryToRemote } from '../mappers';
import type { DbCategory } from '../../../types/database';

export async function pullCategories(familyId: string, since: string): Promise<boolean> {
  const startTotal = Date.now();
  const startSupabase = Date.now();
  const { data, error } = await supabase
    .from('categories')
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
  for (const row of rows as DbCategory[]) {
    const result = await upsertCategoryLocal(row as unknown as Record<string, unknown>);
    if (result === 'inserted') insertCount++;
    else if (result === 'updated') updateCount++;
    else if (result === 'deleted') deleteCount++;
    if (result !== 'skipped') changed = true;
  }
  const loopTime = Date.now() - startLoop;
  const totalTime = Date.now() - startTotal;
  console.log('[PERF] pullCategories', `Supabase: ${supabaseTime}ms`, `Rows: ${rows.length}`, `INSERT: ${insertCount}`, `UPDATE: ${updateCount}`, `DELETE: ${deleteCount}`, `Loop: ${loopTime}ms`, `Total: ${totalTime}ms`);
  return changed;
}

type UpsertResult = 'inserted' | 'updated' | 'deleted' | 'skipped';

async function upsertCategoryLocal(row: Record<string, unknown>): Promise<UpsertResult> {
  const startSqlite = Date.now();
  const db = getDb();
  const id = String(row.id);
  const remoteUpdated = String(row.updated_at ?? '');
  const deletedAt = row.deleted_at as string | null;

  if (deletedAt) {
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    const sqliteTime = Date.now() - startSqlite;
    console.log('[PERF] upsertCategoryLocal DELETE', `${sqliteTime}ms`);
    return 'deleted';
  }

  const local = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM categories WHERE id = ?',
    [id]
  );
  if (local && local.updated_at > remoteUpdated) return 'skipped';

  const isUpdate = Boolean(local);

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

  const sqliteTime = Date.now() - startSqlite;
  console.log('[PERF] upsertCategoryLocal', `${isUpdate ? 'UPDATE' : 'INSERT'}`, `${sqliteTime}ms`);
  return isUpdate ? 'updated' : 'inserted';
}

export async function pushCategory(payload: Record<string, unknown>, familyId: string): Promise<void> {
  const remote = categoryToRemote(payload, familyId);
  const { error } = await supabase.from('categories').upsert(remote, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteCategoryRemote(entityId: string, familyId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', entityId)
    .eq('family_id', familyId);
  if (error) throw new Error(error.message);
}
