/**
 * src/context/RecurringContext.tsx
 * CRUD completo de recurring_rules no Supabase.
 * "Pendente este mês" = last_confirmed é nulo ou anterior ao 1º dia do mês atual.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useApp } from './AppContext';
import { TxType } from '../types';

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
  lastConfirmed: string | null; // 'YYYY-MM-01' ou null
  // Calculado localmente
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

// Primeiro dia do mês atual em UTC
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

function mapRow(row: any): RecurringRule {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    paymentMethod: row.payment_method,
    dayOfMonth: row.day_of_month,
    frequency: row.frequency,
    active: row.active,
    lastConfirmed: row.last_confirmed ?? null,
    confirmedThisMonth: isConfirmedThisMonth(row.last_confirmed),
  };
}

export const RecurringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addTransaction } = useApp();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setRules([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_month', { ascending: true });
      if (error) throw error;
      setRules((data ?? []).map(mapRow));
    } catch (err: any) {
      console.error('RecurringContext.reload:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const addRule = useCallback(async (data: RecurringInput) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('recurring_rules').insert([{
        user_id:        user.id,
        type:           data.type,
        description:    data.description,
        amount:         data.amount,
        category:       data.category,
        category_icon:  data.categoryIcon,
        category_color: data.categoryColor,
        payment_method: data.paymentMethod,
        day_of_month:   data.dayOfMonth,
        frequency:      data.frequency,
        active:         data.active,
      }]);
      if (error) throw error;
      await reload();
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err.message);
    }
  }, [user, reload]);

  const updateRule = useCallback(async (id: string, data: Partial<RecurringInput>) => {
    try {
      const patch: any = {};
      if (data.type           !== undefined) patch.type           = data.type;
      if (data.description    !== undefined) patch.description    = data.description;
      if (data.amount         !== undefined) patch.amount         = data.amount;
      if (data.category       !== undefined) patch.category       = data.category;
      if (data.categoryIcon   !== undefined) patch.category_icon  = data.categoryIcon;
      if (data.categoryColor  !== undefined) patch.category_color = data.categoryColor;
      if (data.paymentMethod  !== undefined) patch.payment_method = data.paymentMethod;
      if (data.dayOfMonth     !== undefined) patch.day_of_month   = data.dayOfMonth;
      if (data.frequency      !== undefined) patch.frequency      = data.frequency;
      if (data.active         !== undefined) patch.active         = data.active;
      patch.updated_at = new Date().toISOString();

      const { error } = await supabase.from('recurring_rules').update(patch).eq('id', id);
      if (error) throw error;
      await reload();
    } catch (err: any) {
      Alert.alert('Erro ao atualizar', err.message);
    }
  }, [reload]);

  const deleteRule = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
      if (error) throw error;
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      Alert.alert('Erro ao excluir', err.message);
    }
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    await updateRule(id, { active: !rule.active });
  }, [rules, updateRule]);

  const confirmRule = useCallback(async (rule: RecurringRule) => {
    if (!user) return;
    try {
      const som = startOfCurrentMonth();

      // 1. Atualiza last_confirmed no banco
      const { error: ruleError } = await supabase
        .from('recurring_rules')
        .update({ last_confirmed: som, updated_at: new Date().toISOString() })
        .eq('id', rule.id);
      if (ruleError) throw ruleError;

      // 2. Cria a transação real
      await addTransaction({
        type:          rule.type,
        amount:        rule.amount,
        description:   rule.description,
        category:      rule.category,
        categoryIcon:  rule.categoryIcon,
        categoryColor: rule.categoryColor,
        paymentMethod: rule.paymentMethod,
        date:          todayStr(),
        isFixed:       true,
      });

      // 3. Atualiza estado local imediatamente (sem reload completo)
      setRules(prev =>
        prev.map(r => r.id === rule.id
          ? { ...r, lastConfirmed: som, confirmedThisMonth: true }
          : r
        )
      );
    } catch (err: any) {
      Alert.alert('Erro ao confirmar', err.message);
    }
  }, [user, addTransaction]);

  return (
    <RecurringContext.Provider value={{ rules, loading, addRule, updateRule, deleteRule, toggleActive, confirmRule, reload }}>
      {children}
    </RecurringContext.Provider>
  );
};
