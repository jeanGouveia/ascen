import { supabase } from '../../supabase';
import { bindNum, bindStr, bindStrNull, bindActive01, getDb } from '../../../db/localDataDb';
import { recurringToRemote } from '../mappers';
import type { DbRecurringRule } from '../../../types/database';

export async function pullRecurringRules(familyId: string, since: string): Promise<void> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('family_id', familyId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) throw new Error(error.message);

  const db = getDb();
  for (const row of (data ?? []) as DbRecurringRule[]) {
    await upsertRecurringRuleLocal(row as unknown as Record<string, unknown>);
  }
}

async function upsertRecurringRuleLocal(row: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const id = String(row.id);
  const remoteUpdated = String(row.updated_at ?? '');
  const deletedAt = row.deleted_at as string | null;

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
      bindActive01(row.active),
      bindStrNull(row.last_confirmed),
      bindStrNull(row.starts_on) ?? remoteUpdated.slice(0, 10),
      bindStr(row.family_id),
      remoteUpdated,
    ]
  );
}

export async function pushRecurringRule(payload: Record<string, unknown>, familyId: string): Promise<void> {
  const remote = recurringToRemote(payload, familyId);
  const { error } = await supabase.from('recurring_rules').upsert(remote, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteRecurringRuleRemote(entityId: string, familyId: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_rules')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', entityId)
    .eq('family_id', familyId);
  if (error) throw new Error(error.message);
}
