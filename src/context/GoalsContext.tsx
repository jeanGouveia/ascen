import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { Goal } from '../types';
import * as localDb from '../db/localDataDb';
import { scheduleSync } from '../services/sync/syncEngine';
import { getLocalFamilyId } from '../services/family';
import { logger } from '../utils/logger';
import { syncLog } from '../utils/syncLogger';
import { logError } from '../services/sentry';

interface GoalsContextType {
  goals: Goal[];
  loading: boolean;
  addGoal: (data: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<Omit<Goal, 'id'>>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  depositToGoal: (id: string, amount: number) => Promise<void>;
  reload: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType>({} as GoalsContextType);
export const useGoals = () => useContext(GoalsContext);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { localDataReady, dataRevision } = useUserLocal();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || !localDataReady) {
      setGoals([]);
      setLoading(false);
      return;
    }
    const before = goals.length;
    try {
      const rows = await localDb.listGoals();
      syncLog(
          "GoalsContext.reload()",
          `rows=${rows.length}`,
          rows.map(r => r.name).join(", ")
      );
      setGoals([...rows]);
      syncLog(
    'GOALS_RELOAD',
    `before=${before}`,
    `after=${rows.length}`,
    `ids=${rows.map(r => r.id).join(',')}`,
    `names=${rows.map(r => r.name).join(',')}`,
);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to reload goals');
      logError(error, { context: 'reloadGoals' });
      logger.error('Metas:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user, localDataReady]);

  useEffect(() => {
    syncLog('GOALS_CONTEXT', `dataRevision=${dataRevision}`, 'reload()');
    void reload();
  }, [reload, dataRevision]);

  useFocusEffect(
    React.useCallback(() => {
      void reload();
    }, [reload])
  );

  const addGoal = useCallback(
    async (data: Omit<Goal, 'id'>) => {
      if (!localDataReady) return;
      try {
        const id = await localDb.insertGoal(data);
        const familyId = await getLocalFamilyId();
        syncLog(
          'Goal criada',
          `id=${id}`,
          `timestamp=${Date.now()}`,
          `familyId=${familyId ?? 'null'}`,
        );
        if (user) scheduleSync(user.id);
        await reload();
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Failed to add goal');
        logError(error, { context: 'addGoal', data });
        Alert.alert('Erro', 'Falha ao criar meta. Tente novamente.');
      }
    },
    [localDataReady, reload, user]
  );

  const updateGoal = useCallback(
    async (id: string, data: Partial<Omit<Goal, 'id'>>) => {
      if (!localDataReady) return;
      try {
        await localDb.updateGoal(id, data);
        const familyId = await getLocalFamilyId();
        syncLog(
          'Goal editada',
          `id=${id}`,
          `timestamp=${Date.now()}`,
          `familyId=${familyId ?? 'null'}`,
        );
        if (user) scheduleSync(user.id);
        await reload();
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Failed to update goal');
        logError(error, { context: 'updateGoal', id, data });
        Alert.alert('Erro', 'Falha ao atualizar meta. Tente novamente.');
      }
    },
    [localDataReady, reload, user]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      if (!localDataReady) return;
      try {
        await localDb.deleteGoal(id);
        const familyId = await getLocalFamilyId();
        syncLog(
          'Goal removida',
          `id=${id}`,
          `timestamp=${Date.now()}`,
          `familyId=${familyId ?? 'null'}`,
        );
        if (user) scheduleSync(user.id);
        setGoals(prev => prev.filter(g => g.id !== id));
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Failed to delete goal');
        logError(error, { context: 'deleteGoal', id });
        Alert.alert('Erro', 'Falha ao excluir meta. Tente novamente.');
      }
    },
    [localDataReady, user]
  );

  const depositToGoal = useCallback(
    async (id: string, amount: number) => {
      if (!localDataReady) return;
      try {
        await localDb.depositGoalLocal(id, amount);
        const familyId = await getLocalFamilyId();
        syncLog(
          'Goal depositada',
          `id=${id}`,
          `amount=${amount}`,
          `timestamp=${Date.now()}`,
          `familyId=${familyId ?? 'null'}`,
        );
        if (user) scheduleSync(user.id);
        await reload();
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Failed to deposit to goal');
        logError(error, { context: 'depositToGoal', id, amount });
        Alert.alert('Erro', 'Falha ao depositar na meta. Tente novamente.');
      }
    },
    [localDataReady, reload, user]
  );

  return (
    <GoalsContext.Provider value={{ goals, loading, addGoal, updateGoal, deleteGoal, depositToGoal, reload }}>
      {children}
    </GoalsContext.Provider>
  );
}
