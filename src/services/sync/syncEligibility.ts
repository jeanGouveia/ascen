/**
 * Estado mínimo de elegibilidade para sync automático.
 * Atualizado por componentes dentro da árvore de providers;
 * lido por gatilhos externos (ex.: NavigationContainer.onStateChange).
 *
 * Limpeza explícita via clearSyncEligibility() em logout, troca de usuário,
 * troca de família ou exclusão de conta — ver AuthContext.signOut() na
 * Sprint de autenticação para chamada síncrona imediata.
 */

import { syncLog } from "../../utils/syncLogger";

export type SyncEligibilitySnapshot = Readonly<{
  canSync: boolean;
  userId: string | null;
}>;

const INELIGIBLE_SNAPSHOT: SyncEligibilitySnapshot = Object.freeze({
  canSync: false,
  userId: null,
});

let currentUserId: string | null = null;
let currentLocalDataReady = false;

function toSnapshot(canSync: boolean, userId: string | null): SyncEligibilitySnapshot {
  return Object.freeze({ canSync, userId });
}

export function updateSyncEligibility(userId: string | null, localDataReady: boolean): void {
  syncLog(
      "updateSyncEligibility()",
      `userId=${userId}`,
      `localDataReady=${localDataReady}`
  );
  currentUserId = userId;
  currentLocalDataReady = localDataReady;
}

/** Zera o estado em memória. Use em logout, troca de usuário/família ou exclusão de conta. */
export function clearSyncEligibility(): void {
  currentUserId = null;
  currentLocalDataReady = false;
}

/** Retorna sempre um snapshot imutável; nunca expõe referência ao estado interno. */
export function getSyncEligibility(): SyncEligibilitySnapshot {
  if (!currentUserId || !currentLocalDataReady) {
    return INELIGIBLE_SNAPSHOT;
  }
  return toSnapshot(true, currentUserId);
}
