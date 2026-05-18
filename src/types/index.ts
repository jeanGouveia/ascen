// src/types/index.ts — ATUALIZADO
// Adicionado campo isFixed para identificar lançamentos gerados por recorrência

export type TxType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  categoryId?: string;
  date: string;
  paymentMethod: string;
  isInstallment?: boolean;
  installmentInfo?: string;
  isFixed?: boolean;    // true = gerado por uma Conta Recorrente
  isPaid?: boolean;
  notes?: string;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  deadline?: string;
  completed?: boolean;
}

export interface TxModalState {
  visible: boolean;
  defaultType: TxType;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  isDefault?: boolean;
}
