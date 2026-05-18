import { getDb } from '../../db/localDataDb';
import type { SyncEntity, SyncOperation } from '../../types/database';

export type OutboxRow = {
  id: number;
  entity: SyncEntity;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
};

export async function enqueueSync(
  entity: SyncEntity,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO sync_outbox (entity, entity_id, operation, payload, attempts, created_at)
     VALUES (?, ?, ?, ?, 0, datetime('now'))`,
    [entity, entityId, operation, JSON.stringify(payload)]
  );
}

export async function listPendingOutbox(limit = 50): Promise<OutboxRow[]> {
  const db = getDb();
  return db.getAllAsync<OutboxRow>(
    `SELECT id, entity, entity_id as entity_id, operation, payload, attempts, last_error, created_at
     FROM sync_outbox ORDER BY id ASC LIMIT ?`,
    [limit]
  );
}

export async function countPendingOutbox(): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM sync_outbox');
  return row?.c ?? 0;
}

export async function removeOutboxItem(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', [id]);
}

export async function markOutboxFailed(id: number, error: string, attempts: number): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE sync_outbox SET last_error = ?, attempts = ? WHERE id = ?',
    [error.slice(0, 500), attempts, id]
  );
}
