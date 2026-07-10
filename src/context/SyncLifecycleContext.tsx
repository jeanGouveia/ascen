import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { requestSync } from '../services/sync/syncCoordinator';
import { clearSyncEligibility, updateSyncEligibility } from '../services/sync/syncEligibility';
import { SyncReason } from '../types/sync';
import { syncLog } from '../utils/syncLogger';

interface Props {
  children: React.ReactNode;
}

/**
 * Escuta AppState e solicita sync ao retornar do background.
 * A decisão SE pode sincronizar fica aqui; o QUANDO (cooldown) fica no SyncCoordinator.
 */
export function SyncLifecycleProvider({ children }: Props) {
  const { user } = useAuth();
  const { localDataReady } = useUserLocal();

  useEffect(() => {
    syncLog('[GATE] SyncLifecycle eligibility check', `user=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`);
    if (!user || !localDataReady) {
      syncLog('[GATE] SyncLifecycle BLOCKED', `reason=${!user ? 'no user' : 'localDataReady=false'}`);
      clearSyncEligibility();
      return;
    }
    syncLog('[GATE] SyncLifecycle PASSED - updating eligibility');
    updateSyncEligibility(user.id, localDataReady);
  }, [user, localDataReady]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      syncLog('[GATE] AppState change', `state=${nextAppState}`, `user=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`);
      if (nextAppState !== 'active') {
        syncLog('[GATE] AppState BLOCKED - not active');
        return;
      }
      if (!user || !localDataReady) {
        syncLog('[GATE] AppState BLOCKED', `reason=${!user ? 'no user' : 'localDataReady=false'}`);
        return;
      }
      syncLog('[GATE] AppState PASSED - calling requestSync');
      void requestSync(user.id, SyncReason.APP_FOREGROUND);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, localDataReady]);

  return <>{children}</>;
}
