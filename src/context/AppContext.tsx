import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { Transaction, TxType, TxModalState } from '../types';
import * as localDb from '../db/localDataDb';
import { scheduleSync } from '../services/sync/syncEngine';

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
  const { localDataReady, dataRevision } = useUserLocal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<TxModalState>({ visible: false, defaultType: 'expense' });

  const fetchTransactions = useCallback(async () => {
    if (!user || !localDataReady) return;
    try {
      const rows = await localDb.listTransactions();
      setTransactions(rows);
    } catch (error: unknown) {
      console.error('Erro ao buscar transações:', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
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
  }, [user, localDataReady, dataRevision, fetchTransactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    if (!user || !localDataReady) return;
    try {
      await localDb.insertTransaction(data);
      scheduleSync(user.id);
      await fetchTransactions();
    } catch (error: unknown) {
      Alert.alert('Erro ao salvar', error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, [user, localDataReady, fetchTransactions]);

  const addTransactions = useCallback(
    async (txs: Omit<Transaction, 'id'>[]) => {
      if (!user || !localDataReady || txs.length === 0) return;
      try {
        for (const tx of txs) {
          await localDb.insertTransaction(tx);
        }
        scheduleSync(user.id);
        await fetchTransactions();
      } catch (error: unknown) {
        Alert.alert('Erro ao salvar', error instanceof Error ? error.message : 'Erro desconhecido');
      }
    },
    [user, localDataReady, fetchTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!localDataReady) return;
      try {
        await localDb.deleteTransaction(id);
        if (user) scheduleSync(user.id);
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (error: unknown) {
        Alert.alert('Erro ao excluir', error instanceof Error ? error.message : 'Erro desconhecido');
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

  return (
    <AppContext.Provider
      value={{
        transactions,
        loading,
        addTransaction,
        addTransactions,
        deleteTransaction,
        openTxModal,
        closeTxModal,
        modalState,
        fetchTransactions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
