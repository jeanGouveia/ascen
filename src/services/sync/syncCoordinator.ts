import { runFullSync, runPullOnly } from './syncEngine';
import { syncLog } from '../../utils/syncLogger';
import type { SyncResult } from './syncEngine';
import { SyncReason } from '../../types/sync';

/**
 * Coordenador de sincronização.
 *
 * Responsabilidade: receber solicitações e disparar sync (full ou pull-only).
 *
 * NÃO decide SE deve sincronizar (essa decisão cabe ao chamador).
 * NÃO conhece React, Contexts, autenticação ou estado da aplicação.
 */

export function requestSync(userId: string | null, reason: SyncReason = SyncReason.MANUAL): Promise<SyncResult> {
  syncLog('[SYNC] requestSync accepted', `reason=${reason}`, `userId=${userId ?? 'null'}`);
  return runFullSync(userId, reason);
}

export function requestPullOnly(userId: string | null, reason: SyncReason = SyncReason.NAVIGATION): Promise<SyncResult> {
  syncLog('[SYNC] requestPullOnly accepted', `reason=${reason}`, `userId=${userId ?? 'null'}`);
  return runPullOnly(userId, reason);
}
