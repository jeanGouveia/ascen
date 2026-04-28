import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { Transaction, TxType, TxModalState } from '../types';

interface AppContextType {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<TxModalState>({ visible: false, defaultType: 'expense' });

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar transações:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    fetchTransactions();
  }, [user, fetchTransactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{ ...data, user_id: user?.id }]);

      if (error) throw error;
      fetchTransactions();
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error.message);
    }
  }, [user, fetchTransactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      Alert.alert('Erro ao excluir', error.message);
    }
  }, []);

  const openTxModal = useCallback((defaultType: TxType = 'expense') => {
    setModalState({ visible: true, defaultType });
  }, []);

  const closeTxModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <AppContext.Provider value={{ 
      transactions, 
      loading, 
      addTransaction, 
      deleteTransaction, 
      openTxModal, 
      closeTxModal,
      modalState,
      fetchTransactions
    }}>
      {children}
    </AppContext.Provider>
  );
};
