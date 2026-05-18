import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { Goal } from '../types';
import * as localDb from '../db/localDataDb';

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
    try {
      const rows = await localDb.listGoals();
      setGoals(rows);
    } catch (e) {
      console.error('Metas:', e instanceof Error ? e.message : e);
    } finally {
      setLoading(false);
    }
  }, [user, localDataReady]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  const addGoal = useCallback(
    async (data: Omit<Goal, 'id'>) => {
      if (!localDataReady) return;
      try {
        await localDb.insertGoal(data);
        await reload();
      } catch (e) {
        Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao criar meta');
      }
    },
    [localDataReady, reload]
  );

  const updateGoal = useCallback(
    async (id: string, data: Partial<Omit<Goal, 'id'>>) => {
      if (!localDataReady) return;
      try {
        await localDb.updateGoal(id, data);
        await reload();
      } catch (e) {
        Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao atualizar');
      }
    },
    [localDataReady, reload]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      if (!localDataReady) return;
      try {
        await localDb.deleteGoal(id);
        setGoals(prev => prev.filter(g => g.id !== id));
      } catch (e) {
        Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao excluir');
      }
    },
    [localDataReady]
  );

  const depositToGoal = useCallback(
    async (id: string, amount: number) => {
      const goal = goals.find(g => g.id === id);
      if (!goal) return;
      const newCurrent = Math.min(goal.current + amount, goal.target);
      const completed = newCurrent >= goal.target;
      await updateGoal(id, { current: newCurrent, completed });
    },
    [goals, updateGoal]
  );

  return (
    <GoalsContext.Provider value={{ goals, loading, addGoal, updateGoal, deleteGoal, depositToGoal, reload }}>
      {children}
    </GoalsContext.Provider>
  );
}
