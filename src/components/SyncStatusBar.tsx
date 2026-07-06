import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSyncStore } from '../store/syncStore';
import { useAuth } from '../context/AuthContext';
import { runFullSync } from '../services/sync/syncEngine';
import { SyncReason } from '../types/sync';

export function SyncStatusBar() {
  const { C } = useAppTheme();
  const { user } = useAuth();
  const { status, pendingCount, lastError } = useSyncStore();

  if (status === 'idle' && pendingCount === 0) return null;

  const label =
    status === 'syncing'
      ? 'Sincronizando…'
      : status === 'offline'
        ? 'Sem conexão · alterações guardadas no aparelho'
        : pendingCount > 0
          ? `${pendingCount} alteração(ões) pendente(s)`
          : lastError
            ? 'Erro ao sincronizar'
            : null;

  if (!label) return null;

  return (
    <TouchableOpacity
      onPress={() => user && void runFullSync(user.id, SyncReason.MANUAL)}
      style={{
        backgroundColor: status === 'error' ? C.dangerLight : C.primaryLight,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: status === 'error' ? C.danger : C.primary }}>
        {label} · toque para tentar de novo
      </Text>
    </TouchableOpacity>
  );
}
