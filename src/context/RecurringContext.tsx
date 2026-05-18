/**
 * Regras recorrentes no SQLite local. Confirmação do mês atualiza last_confirmed e cria transação via AppContext.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { useApp } from './AppContext';
import { TxType } from '../types';
import * as localDb from '../db/localDataDb';
import { scheduleSync } from '../services/sync/syncEngine';
import { confirmDateForRule, isRuleActiveInCurrentMonth } from '../utils/recurringDates';
import { buildProjectedTransaction, transactionMatchesRuleMonth } from '../utils/recurringTransactions';
import { syncRecurringProjectedTransactions } from '../services/recurringProjections';

export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly';

export interface RecurringRule {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  paymentMethod: string;
  dayOfMonth: number;
  frequency: RecurringFrequency;
  active: boolean;
  lastConfirmed: string | null;
  /** Primeiro mês em que a recorrência vale (AAAA-MM-DD). */
  startsOn: string;
  confirmedThisMonth?: boolean;
  skippedThisMonth?: boolean;
}

export type RecurringInput = Omit<RecurringRule, 'id' | 'lastConfirmed' | 'confirmedThisMonth' | 'skippedThisMonth'>;

interface RecurringContextType {
  rules: RecurringRule[];
  loading: boolean;
  addRule: (data: RecurringInput) => Promise<void>;
  updateRule: (id: string, data: Partial<RecurringInput>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  confirmRule: (rule: RecurringRule) => Promise<void>;
  reload: () => Promise<void>;
}

const RecurringContext = createContext<RecurringContextType>({} as RecurringContextType);
export const useRecurring = () => useContext(RecurringContext);

function startOfCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function isConfirmedThisMonth(lastConfirmed: string | null): boolean {
  if (!lastConfirmed) return false;
  return lastConfirmed >= startOfCurrentMonth();
}

function mapRow(row: localDb.LocalRecurringRow): RecurringRule {
  return {
    id: row.id,
    type: row.type as TxType,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    paymentMethod: row.payment_method,
    dayOfMonth: row.day_of_month,
    frequency: row.frequency,
    active: Boolean(row.active),
    lastConfirmed: row.last_confirmed ?? null,
    startsOn: row.starts_on ?? row.updated_at?.slice(0, 10) ?? todayStr(),
    confirmedThisMonth: isConfirmedThisMonth(row.last_confirmed),
  };
}

export const RecurringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { localDataReady, dataRevision } = useUserLocal();
  const { addTransaction, fetchTransactions } = useApp();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || !localDataReady) {
      setRules([]);
      setLoading(false);
      return;
    }
    try {
      const rows = await localDb.listRecurringRows();
      setRules(rows.map(mapRow));
    } catch (err: unknown) {
      console.error('RecurringContext.reload:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, [user, localDataReady]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  const addRule = useCallback(
    async (data: RecurringInput) => {
      if (!user || !localDataReady) return;
      try {
        const id = await localDb.insertRecurringRow({
          type: data.type,
          description: data.description,
          amount: data.amount,
          category: data.category,
          categoryIcon: data.categoryIcon,
          categoryColor: data.categoryColor,
          paymentMethod: data.paymentMethod,
          dayOfMonth: data.dayOfMonth,
          frequency: data.frequency,
          active: data.active,
          startsOn: data.startsOn,
        });
        await syncRecurringProjectedTransactions({ id, ...data });
        scheduleSync(user.id);
        await fetchTransactions();
        await reload();
      } catch (err: unknown) {
        Alert.alert('Erro ao salvar', err instanceof Error ? err.message : 'Erro desconhecido');
      }
    },
    [user, localDataReady, reload, fetchTransactions]
  );

  const updateRule = useCallback(
    async (id: string, data: Partial<RecurringInput>) => {
      if (!localDataReady) return;
      try {
        await localDb.updateRecurringRow(id, {
          type: data.type,
          description: data.description,
          amount: data.amount,
          category: data.category,
          categoryIcon: data.categoryIcon,
          categoryColor: data.categoryColor,
          paymentMethod: data.paymentMethod,
          dayOfMonth: data.dayOfMonth,
          frequency: data.frequency,
          active: data.active,
          startsOn: data.startsOn,
        });
        const updated = rules.find(r => r.id === id);
        if (updated) {
          await syncRecurringProjectedTransactions({
            ...updated,
            ...data,
            type: data.type ?? updated.type,
            description: data.description ?? updated.description,
            amount: data.amount ?? updated.amount,
            category: data.category ?? updated.category,
            categoryIcon: data.categoryIcon ?? updated.categoryIcon,
            categoryColor: data.categoryColor ?? updated.categoryColor,
            paymentMethod: data.paymentMethod ?? updated.paymentMethod,
            dayOfMonth: data.dayOfMonth ?? updated.dayOfMonth,
            frequency: data.frequency ?? updated.frequency,
            active: data.active ?? updated.active,
            startsOn: data.startsOn ?? updated.startsOn,
          });
        }
        if (user) scheduleSync(user.id);
        await fetchTransactions();
        await reload();
      } catch (err: unknown) {
        Alert.alert('Erro ao atualizar', err instanceof Error ? err.message : 'Erro desconhecido');
      }
    },
    [localDataReady, reload, user, rules, fetchTransactions]
  );

  const deleteRule = useCallback(
    async (id: string) => {
      if (!localDataReady) return;
      try {
        await localDb.deleteUnpaidRecurringTxsForRule(id);
        await localDb.deleteRecurringRow(id);
        if (user) scheduleSync(user.id);
        await fetchTransactions();
        setRules(prev => prev.filter(r => r.id !== id));
      } catch (err: unknown) {
        Alert.alert('Erro ao excluir', err instanceof Error ? err.message : 'Erro desconhecido');
      }
    },
    [localDataReady, user, fetchTransactions]
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const rule = rules.find(r => r.id === id);
      if (!rule) return;
      await updateRule(id, { active: !rule.active });
    },
    [rules, updateRule]
  );

  const confirmRule = useCallback(
    async (rule: RecurringRule) => {
      if (!user || !localDataReady) return;
      try {
        if (!isRuleActiveInCurrentMonth(rule)) {
          Alert.alert(
            'Ainda não vigente',
            `Esta recorrência começa em ${rule.startsOn.split('-').reverse().join('/')}.`
          );
          return;
        }
        const som = startOfCurrentMonth();
        const txDate = confirmDateForRule(rule);
        const yearMonth = som.slice(0, 7);
        await localDb.updateRecurringRow(rule.id, { lastConfirmed: som });

        const txs = await localDb.listTransactions();
        const existing = txs.find(t => transactionMatchesRuleMonth(t, rule.id, yearMonth));

        if (existing) {
          await localDb.updateTransaction(existing.id, { isPaid: true, date: txDate });
        } else {
          await localDb.insertTransaction({
            ...buildProjectedTransaction(rule, txDate),
            isPaid: true,
          });
        }

        scheduleSync(user.id);
        await fetchTransactions();
        setRules(prev =>
          prev.map(r =>
            r.id === rule.id ? { ...r, lastConfirmed: som, confirmedThisMonth: true } : r
          )
        );
      } catch (err: unknown) {
        Alert.alert('Erro ao confirmar', err instanceof Error ? err.message : 'Erro desconhecido');
      }
    },
    [user, localDataReady, fetchTransactions]
  );

  return (
    <RecurringContext.Provider
      value={{ rules, loading, addRule, updateRule, deleteRule, toggleActive, confirmRule, reload }}
    >
      {children}
    </RecurringContext.Provider>
  );
};
