import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { Transaction, TxType, TxModalState } from '../types';
import * as localDb from '../db/localDataDb';
import { scheduleSync } from '../services/sync/syncEngine';
import { logger } from '../utils/logger';
import { logError } from '../services/sentry';
import { syncLog } from '../utils/syncLogger';

interface AppContextType {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  addTransactions: (txs: Omit<Transaction, 'id'>[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  openTxModal: (defaultType?: TxType) => void;
  closeTxModal: () => void;
  modalState: TxModalState;
  fetchTransactions: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { localDataReady, onTransactionsChanged } = useUserLocal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<TxModalState>({ visible: false, defaultType: 'expense' });

  const fetchTransactions = useCallback(async () => {
    console.log('[PERF] AppContext reload start');
    if (!user || !localDataReady) return;
    try {
      const startSqlite = Date.now();
      const rows = await localDb.listTransactions();
      const sqliteTime = Date.now() - startSqlite;
      console.log('[PERF] AppContext reload sqlite', `${sqliteTime}ms`);
      const startSetState = Date.now();
      setTransactions(rows);
      const setStateTime = Date.now() - startSetState;
      console.log('[PERF] AppContext reload setState', `${setStateTime}ms`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to fetch transactions');
      logError(err, { context: 'fetchTransactions' });
      logger.error('Erro ao buscar transações:', err.message);
    } finally {
      setLoading(false);
      console.log('[PERF] AppContext reload finished');
    }
  }, [user, localDataReady]);

  useEffect(() => {
    if (!user || !localDataReady) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchTransactions();
  }, [user, localDataReady, fetchTransactions]);

  useEffect(() => {
    if (!user || !localDataReady) return;
    void fetchTransactions();
  }, [onTransactionsChanged, user, localDataReady, fetchTransactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    syncLog('[GATE] AppContext addTransaction CALLED', `userId=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`);
    if (!user || !localDataReady) {
      syncLog('[GATE] AppContext addTransaction BLOCKED', `reason=${!user ? 'no user' : 'localDataReady=false'}`);
      return;
    }
    try {
      await localDb.insertTransaction(data);
      syncLog('[GATE] AppContext addTransaction calling scheduleSync', `userId=${user.id}`);
      scheduleSync(user.id);
      await fetchTransactions();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to add transaction');
      logError(err, { context: 'addTransaction', data });
      Alert.alert('Erro ao salvar', 'Não foi possível salvar a transação. Tente novamente.');
    }
  }, [user, localDataReady, fetchTransactions]);

  const addTransactions = useCallback(
    async (txs: Omit<Transaction, 'id'>[]) => {
      syncLog('[GATE] AppContext addTransactions CALLED', `userId=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`, `count=${txs.length}`);
      if (!user || !localDataReady || txs.length === 0) {
        syncLog('[GATE] AppContext addTransactions BLOCKED', `reason=${!user ? 'no user' : !localDataReady ? 'localDataReady=false' : 'empty array'}`);
        return;
      }
      try {
        for (const tx of txs) {
          await localDb.insertTransaction(tx);
        }
        syncLog('[GATE] AppContext addTransactions calling scheduleSync', `userId=${user.id}`);
        scheduleSync(user.id);
        await fetchTransactions();
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Failed to add transactions');
        logError(err, { context: 'addTransactions', count: txs.length });
        Alert.alert('Erro ao salvar', 'Não foi possível salvar as transações. Tente novamente.');
      }
    },
    [user, localDataReady, fetchTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      syncLog('[GATE] AppContext deleteTransaction CALLED', `userId=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`);
      if (!localDataReady) {
        syncLog('[GATE] AppContext deleteTransaction BLOCKED', 'reason=localDataReady=false');
        return;
      }
      try {
        await localDb.deleteTransaction(id);
        if (user) {
          syncLog('[GATE] AppContext deleteTransaction calling scheduleSync', `userId=${user.id}`);
          scheduleSync(user.id);
        }
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Failed to delete transaction');
        logError(err, { context: 'deleteTransaction', id });
        Alert.alert('Erro ao excluir', 'Não foi possível excluir a transação. Tente novamente.');
      }
    },
    [localDataReady, user]
  );

  const openTxModal = useCallback((defaultType: TxType = 'expense') => {
    setModalState({ visible: true, defaultType });
  }, []);

  const closeTxModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  const value = useMemo(
    () => ({
      transactions,
      loading,
      addTransaction,
      addTransactions,
      deleteTransaction,
      openTxModal,
      closeTxModal,
      modalState,
      fetchTransactions,
    }),
    [transactions, loading, addTransaction, addTransactions, deleteTransaction, openTxModal, closeTxModal, modalState, fetchTransactions]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
