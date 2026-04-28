export type TxType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  date: string;
  paymentMethod: string;
  isInstallment?: boolean;
  installmentInfo?: string;
  isFixed?: boolean;
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
