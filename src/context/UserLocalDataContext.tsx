import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './AuthContext';
import {
  closeUserDatabase,
  ensureUserDatabase,
  metaGet,
} from '../db/localDataDb';
import { ensureUserFamily } from '../services/family';
import { initialSync, registerSyncCompletionCallback, unregisterSyncCompletionCallback, hasDatabaseChanges } from '../services/sync/syncEngine';
import { countPendingOutbox } from '../services/sync/outbox';
import { useSyncStore } from '../store/syncStore';
import { logger } from '../utils/logger';
import { syncLog } from '../utils/syncLogger';
import {
  downloadEncryptedSnapshot,
  restoreFromEncryptedSnapshot,
  uploadEncryptedSnapshot,
  getBackupStorageTarget,
  setBackupStorageTarget,
  type BackupStorageTarget,
} from '../experimental/backup/services/cloudSnapshot';
import {
  getCachedBackupPassphrase,
  hasBackupPassphraseConfigured,
  purgeLegacyCachedPassphrases,
  setBackupPassphrase,
  verifyBackupPassphrase,
} from '../experimental/backup/services/backupPassphrase';
import { localAvatarExists, localAvatarPath } from '../services/localAvatar';
import { hasGoogleDriveAccess } from '../experimental/backup/services/googleDriveSnapshot';
import { isGoogleDriveConfigured } from '../experimental/backup/config/googleOAuth';
import { C_light } from '../styles/theme';

interface UserLocalDataContextType {
  localDataReady: boolean;
  localDataError: string | null;
  retryInit: () => void;
  dataRevision: number;
  bumpDataRevision: () => void;
  notifyDatabaseChanged: () => void;
  localAvatarUri: string | null;
  refreshLocalAvatar: () => Promise<void>;
  lastSnapshotUploadAt: string | null;
  refreshSnapshotMeta: () => Promise<void>;
  backupPassphraseReady: boolean;
  refreshBackupPassphraseState: () => Promise<void>;
  configureBackupPassphrase: (passphrase: string) => Promise<void>;
  backupStorageTarget: BackupStorageTarget;
  setStorageTarget: (t: BackupStorageTarget) => Promise<void>;
  canUseGoogleDrive: boolean;
  googleDriveReady: boolean;
  refreshGoogleDriveState: () => Promise<void>;
  runCloudBackup: (passphrase: string) => Promise<void>;
  runCloudRestore: (passphrase: string) => Promise<void>;
}

const UserLocalDataContext = createContext<UserLocalDataContextType>({} as UserLocalDataContextType);
export const useUserLocal = () => useContext(UserLocalDataContext);

type ReadyState = boolean | null;

export function UserLocalDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [readyState, setReadyState] = useState<ReadyState>(null);
  const [localDataError, setLocalDataError] = useState<string | null>(null);
  const [initNonce, setInitNonce] = useState(0);
  const [dataRevision, setDataRevision] = useState(0);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [lastSnapshotUploadAt, setLastSnapshotUploadAt] = useState<string | null>(null);
  const [backupPassphraseReady, setBackupPassphraseReady] = useState(false);
  const [backupStorageTarget, setBackupStorageTargetState] = useState<BackupStorageTarget>('supabase');
  const [googleDriveReady, setGoogleDriveReady] = useState(false);

  const bumpDataRevision = useCallback(() => setDataRevision(r => r + 1), []);

  const notifyDatabaseChanged = useCallback(() => {
    syncLog('DATABASE_CHANGED', `before=${dataRevision}`, `after=${dataRevision + 1}`);
    bumpDataRevision();
  }, [bumpDataRevision, dataRevision]);

  useEffect(() => {
    const handleSyncCompletion = (result: import('../services/sync/syncEngine').SyncResult) => {
      syncLog('DATABASE_CHANGED_CALLBACK', `goals=${result.changedEntities.goals}`, `categories=${result.changedEntities.categories}`, `transactions=${result.changedEntities.transactions}`, `recurring=${result.changedEntities.recurring}`);
      if (hasDatabaseChanges(result)) {
        notifyDatabaseChanged();
      }
    };

    registerSyncCompletionCallback(handleSyncCompletion);

    return () => {
      unregisterSyncCompletionCallback();
    };
  }, [notifyDatabaseChanged]);

  const refreshLocalAvatar = useCallback(async () => {
    if (!user?.id) {
      setLocalAvatarUri(null);
      return;
    }
    const exists = await localAvatarExists(user.id);
    setLocalAvatarUri(exists ? `${localAvatarPath(user.id)}?t=${Date.now()}` : null);
  }, [user?.id]);

  const refreshSnapshotMeta = useCallback(async () => {
    if (!user) {
      setLastSnapshotUploadAt(null);
      return;
    }
    try {
      const v = await metaGet('last_snapshot_upload_at');
      setLastSnapshotUploadAt(v);
    } catch {
      setLastSnapshotUploadAt(null);
    }
  }, [user]);

  const refreshBackupPassphraseState = useCallback(async () => {
    if (!user?.id) {
      setBackupPassphraseReady(false);
      return;
    }
    setBackupPassphraseReady(await hasBackupPassphraseConfigured(user.id));
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    setReadyState(null);
    setLocalDataError(null);

    async function init() {
      if (!user) {
        await closeUserDatabase();
        if (!cancelled) {
          setLocalAvatarUri(null);
          setLastSnapshotUploadAt(null);
          setBackupPassphraseReady(false);
          setReadyState(false);
        }
        return;
      }

      if (Platform.OS === 'web') {
        if (!cancelled) {
          setLocalDataError('Os dados financeiros ficam no dispositivo: use o app no iOS ou Android.');
          setReadyState(null);
        }
        return;
      }

      try {
        await ensureUserDatabase(user.id);
        if (cancelled) return;

        await ensureUserFamily(user.id);
        if (cancelled) return;

        await purgeLegacyCachedPassphrases(user.id);
        if (cancelled) return;

        try {
          await initialSync(user.id);
          const pending = await countPendingOutbox();
          useSyncStore.getState().setPendingCount(pending);
          useSyncStore.getState().setLastSyncAt(new Date().toISOString());
        } catch (syncErr) {
          logger.warn('Sync inicial:', syncErr instanceof Error ? syncErr.message : syncErr);
          useSyncStore.getState().setStatus('offline');
        }

        if (cancelled) return;

        const [exists, , passphraseOk, storageTarget, driveOk] = await Promise.all([
          localAvatarExists(user.id),
          (async () => {
            try {
              const v = await metaGet('last_snapshot_upload_at');
              if (!cancelled) setLastSnapshotUploadAt(v);
            } catch {
              if (!cancelled) setLastSnapshotUploadAt(null);
            }
          })(),
          hasBackupPassphraseConfigured(user.id),
          getBackupStorageTarget(),
          hasGoogleDriveAccess(),
        ]);

        if (!cancelled) {
          setLocalAvatarUri(exists ? `${localAvatarPath(user.id)}?t=${Date.now()}` : null);
          setBackupPassphraseReady(passphraseOk);
          setBackupStorageTargetState(storageTarget);
          setGoogleDriveReady(driveOk);
        }
      } catch (e) {
        if (!cancelled) {
          setLocalDataError(e instanceof Error ? e.message : 'Erro ao abrir dados locais.');
          return;
        }
      }
      if (!cancelled) setReadyState(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [user?.id, initNonce]);

  const retryInit = useCallback(() => setInitNonce(n => n + 1), []);

  const refreshGoogleDriveState = useCallback(async () => {
    setGoogleDriveReady(await hasGoogleDriveAccess());
  }, []);

  const configureBackupPassphrase = useCallback(
    async (passphrase: string) => {
      if (!user?.id) throw new Error('Sessão inválida.');
      await setBackupPassphrase(user.id, passphrase);
      setBackupPassphraseReady(true);
    },
    [user?.id]
  );

  const setStorageTarget = useCallback(async (t: BackupStorageTarget) => {
    await setBackupStorageTarget(t);
    setBackupStorageTargetState(t);
  }, []);

  const resolvePassphrase = useCallback(
    async (provided: string): Promise<string> => {
      if (!user?.id) throw new Error('Sessão inválida.');
      const trimmed = provided.trim();
      if (trimmed.length >= 8) {
        const configured = await hasBackupPassphraseConfigured(user.id);
        if (configured) {
          const ok = await verifyBackupPassphrase(user.id, trimmed);
          if (!ok) throw new Error('Senha de backup incorreta.');
        }
        return trimmed;
      }
      const cached = await getCachedBackupPassphrase(user.id);
      if (cached) return cached;
      throw new Error('Configure uma senha de backup (mínimo 8 caracteres) antes de continuar.');
    },
    [user?.id]
  );

  const runCloudBackup = useCallback(
    async (passphrase: string) => {
      if (!user?.id) throw new Error('Sessão inválida.');
      const phrase = await resolvePassphrase(passphrase);
      const configured = await hasBackupPassphraseConfigured(user.id);
      if (!configured) await setBackupPassphrase(user.id, phrase);
      await uploadEncryptedSnapshot(user.id, phrase);
      await refreshSnapshotMeta();
    },
    [user?.id, resolvePassphrase, refreshSnapshotMeta]
  );

  const runCloudRestore = useCallback(
    async (passphrase: string) => {
      if (!user?.id) throw new Error('Sessão inválida.');
      const phrase = await resolvePassphrase(passphrase);
      const bytes = await downloadEncryptedSnapshot(user.id);
      if (!bytes) throw new Error('Nenhum backup encontrado na nuvem.');
      await restoreFromEncryptedSnapshot(bytes, user.id, phrase);
      await refreshLocalAvatar();
      bumpDataRevision();
    },
    [user?.id, resolvePassphrase, refreshLocalAvatar, bumpDataRevision]
  );

  const canUseGoogleDrive = isGoogleDriveConfigured();

  const value: UserLocalDataContextType = {
    localDataReady: readyState === true,
    localDataError,
    retryInit,
    dataRevision,
    bumpDataRevision,
    notifyDatabaseChanged,
    localAvatarUri,
    refreshLocalAvatar,
    lastSnapshotUploadAt,
    refreshSnapshotMeta,
    backupPassphraseReady,
    refreshBackupPassphraseState,
    configureBackupPassphrase,
    backupStorageTarget,
    setStorageTarget,
    canUseGoogleDrive,
    googleDriveReady,
    refreshGoogleDriveState,
    runCloudBackup,
    runCloudRestore,
  };

  if (readyState === null) {
    const inner = localDataError ? (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: C_light.bg }}>
        <Text style={{ color: C_light.danger, textAlign: 'center', marginBottom: 16, fontSize: 16 }}>{localDataError}</Text>
        <TouchableOpacity onPress={retryInit} style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: C_light.primary, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Tentar de novo</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C_light.bg }}>
        <ActivityIndicator size="large" color={C_light.primary} />
        <Text style={{ marginTop: 14, color: C_light.textMuted, fontSize: 15 }}>Preparando seus dados…</Text>
      </View>
    );
    return <UserLocalDataContext.Provider value={value}>{inner}</UserLocalDataContext.Provider>;
  }

  return <UserLocalDataContext.Provider value={value}>{children}</UserLocalDataContext.Provider>;
}
