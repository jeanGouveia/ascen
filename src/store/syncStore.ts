import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

type SyncState = {
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  pendingCount: number;
  setStatus: (status: SyncStatus) => void;
  setLastSyncAt: (iso: string | null) => void;
  setLastError: (msg: string | null) => void;
  setPendingCount: (n: number) => void;
};

export const useSyncStore = create<SyncState>(set => ({
  status: 'idle',
  lastSyncAt: null,
  lastError: null,
  pendingCount: 0,
  setStatus: status => set({ status }),
  setLastSyncAt: lastSyncAt => set({ lastSyncAt }),
  setLastError: lastError => set({ lastError }),
  setPendingCount: pendingCount => set({ pendingCount }),
}));
