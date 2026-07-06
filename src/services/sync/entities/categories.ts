import { supabase } from '../../supabase';
import { bindStr, bindStrNull, getDb } from '../../../db/localDataDb';
import { categoryToRemote } from '../mappers';
import type { DbCategory } from '../../../types/database';

export async function pullCategories(familyId: string, since: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('family_id', familyId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) throw new Error(error.message);

  let changed = false;
  const db = getDb();
  for (const row of (data ?? []) as DbCategory[]) {
    const result = await upsertCategoryLocal(row as unknown as Record<string, unknown>);
    if (result !== 'skipped') changed = true;
  }
  return changed;
}

type UpsertResult = 'inserted' | 'updated' | 'deleted' | 'skipped';

async function upsertCategoryLocal(row: Record<string, unknown>): Promise<UpsertResult> {
  const db = getDb();
  const id = String(row.id);
  const remoteUpdated = String(row.updated_at ?? '');
  const deletedAt = row.deleted_at as string | null;

  if (deletedAt) {
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
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
