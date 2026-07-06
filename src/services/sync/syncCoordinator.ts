import { runFullSync } from './syncEngine';
import { syncLog } from '../../utils/syncLogger';
import type { SyncResult } from './syncEngine';

/**
 * Coordenador de sincronização.
 *
 * Responsabilidade: receber solicitações e disparar runFullSync().
 *
 * NÃO decide SE deve sincronizar (essa decisão cabe ao chamador).
 * NÃO conhece React, Contexts, autenticação ou estado da aplicação.
 */

export function requestSync(userId: string | null, reason = 'UNKNOWN'): Promise<SyncResult> {
  syncLog('[SYNC] requestSync accepted', `reason=${reason}`, `userId=${userId ?? 'null'}`);
  return runFullSync(userId);
}
