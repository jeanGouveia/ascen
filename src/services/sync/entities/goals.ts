import { supabase } from '../../supabase';
import { bindNum, bindStr, bindStrNull, getDb } from '../../../db/localDataDb';
import { goalToRemote } from '../mappers';
import type { DbGoal } from '../../../types/database';
import { syncLog, syncLogJson } from '../../../utils/syncLogger';

type GoalUpsertResult = 'inserted' | 'updated' | 'deleted' | 'skipped';

export async function pullGoals(familyId: string, since: string): Promise<boolean> {
  const startTotal = Date.now();
  const queryDescription =
    "goals.select('*').eq('family_id', familyId).gt('updated_at', since).order('updated_at', asc)";

  syncLog(
    'pullGoals()',
    'phase=start',
    `familyId=${familyId}`,
    `cursor=${since}`,
    `query=${queryDescription}`,
  );

  const startSupabase = Date.now();
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('family_id', familyId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) {
    syncLog(
      'pullGoals()',
      'phase=error',
      `familyId=${familyId}`,
      `cursor=${since}`,
      `query=${queryDescription}`,
      `error=${error.message}`,
      syncLogJson('errorDetails', error),
    );
    throw new Error(error.message);
  }

  const supabaseTime = Date.now() - startSupabase;
  const rows = (data ?? []) as DbGoal[];

  syncLog(
    'pullGoals()',
    'phase=queryResult',
    `familyId=${familyId}`,
    `cursor=${since}`,
    `count=${rows.length}`,
    `ids=${rows.map(r => r.id).join(',') || '(none)'}`,
    ...rows.map(r => `record id=${r.id} updated_at=${r.updated_at}`),
  );
  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  const startLoop = Date.now();

  for (const row of rows) {
    const result = await upsertGoalLocal(row as unknown as Record<string, unknown>);
    if (result === 'inserted') inserted += 1;
    else if (result === 'updated') updated += 1;
    else if (result === 'deleted') deleted += 1;
  }

  const loopTime = Date.now() - startLoop;
  const totalTime = Date.now() - startTotal;
  console.log('[PERF] pullGoals', `Supabase: ${supabaseTime}ms`, `Rows: ${rows.length}`, `INSERT: ${inserted}`, `UPDATE: ${updated}`, `DELETE: ${deleted}`, `Loop: ${loopTime}ms`, `Total: ${totalTime}ms`);

  syncLog(
    'pullGoals()',
    `received=${rows.length}`,
    `inserted=${inserted}`,
    `updated=${updated}`,
    `deleted=${deleted}`,
    `written=${inserted + updated + deleted}`,
  );
  const db = getDb();

  const total = await db.getFirstAsync<{ total: number }>(
      "SELECT COUNT(*) as total FROM goals"
  );

  const metas = await db.getAllAsync(
      "SELECT id, name, deleted_at, updated_at FROM goals ORDER BY created_at"
  );

  syncLog(
      "SQLITE_GOALS",
      `total=${total?.total ?? 0}`,
      JSON.stringify(metas)
  );

  return inserted > 0 || updated > 0 || deleted > 0;
}

async function upsertGoalLocal(row: Record<string, unknown>): Promise<GoalUpsertResult> {
  const startSqlite = Date.now();
  const db = getDb();
  const id = String(row.id);
  const remoteUpdated = String(row.updated_at ?? '');
  const deletedAt = row.deleted_at as string | null;

  if (deletedAt) {
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
    const sqliteTime = Date.now() - startSqlite;
    console.log('[PERF] upsertGoalLocal DELETE', `${sqliteTime}ms`);
    return 'deleted';
  }

  const local = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM goals WHERE id = ?',
    [id]
  );
  if (local && local.updated_at > remoteUpdated) return 'skipped';

  const isUpdate = Boolean(local);

  await db.runAsync(
    `INSERT INTO goals (id, name, icon, color, target, current, deadline, completed, family_id, updated_at, deleted_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, COALESCE(datetime(?), datetime('now')))
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, icon=excluded.icon, color=excluded.color, target=excluded.target,
       current=excluded.current, deadline=excluded.deadline, completed=excluded.completed,
       family_id=excluded.family_id, updated_at=excluded.updated_at`,
    [
      id,
      bindStr(row.name),
      bindStr(row.icon),
      bindStr(row.color),
      bindNum(row.target),
      bindNum(row.current),
      bindStrNull(row.deadline),
      row.completed ? 1 : 0,
      bindStr(row.family_id),
      remoteUpdated,
      bindStrNull(row.created_at),
    ]
  );

  const sqliteTime = Date.now() - startSqlite;
  console.log('[PERF] upsertGoalLocal', `${isUpdate ? 'UPDATE' : 'INSERT'}`, `${sqliteTime}ms`);
  return isUpdate ? 'updated' : 'inserted';
}

export async function pushGoal(payload: Record<string, unknown>, familyId: string): Promise<void> {
  const goalId = String(payload.id ?? 'unknown');
  const remote = goalToRemote(payload, familyId);
  const updatedAt = String(remote.updated_at ?? '(missing)');

  syncLog(
    'pushGoal()',
    'phase=start',
    `goalId=${goalId}`,
    `familyId=${familyId}`,
    `updated_at=${updatedAt}`,
    syncLogJson('payload', remote),
  );

  const { data, error } = await supabase
    .from('goals')
    .upsert(remote, { onConflict: 'id' })
    .select();

  if (error) {
    syncLog(
      'pushGoal()',
      'phase=error',
      `goalId=${goalId}`,
      `familyId=${familyId}`,
      `updated_at=${updatedAt}`,
      syncLogJson('payload', remote),
      `error=${error.message}`,
      syncLogJson('errorDetails', error),
      'success=false',
    );
    throw new Error(error.message);
  }

  syncLog(
    'pushGoal()',
    'phase=success',
    `goalId=${goalId}`,
    `familyId=${familyId}`,
    `updated_at=${updatedAt}`,
    syncLogJson('payload', remote),
    syncLogJson('response', data),
    'success=true',
  );
}

export async function deleteGoalRemote(entityId: string, familyId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', entityId)
    .eq('family_id', familyId);
  if (error) throw new Error(error.message);
}

export async function pushGoalDeposit(entityId: string, amount: number, familyId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_goal_current', {
    p_goal_id: entityId,
    p_family_id: familyId,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
}
