/** Linhas Supabase (subset usado no sync). */

export type FamilyRole = 'owner' | 'member';

export type DbFamily = {
  id: string;
  owner_id: string;
  join_code: string;
  name: string | null;
  created_at: string;
  updated_at: string;
};

export type DbFamilyMember = {
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
};

export type DbCategory = {
  id: string;
  family_id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DbTransaction = {
  id: string;
  family_id: string;
  created_by: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_id: string | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  date: string;
  payment_method: string;
  is_recurring: boolean;
  is_installment: boolean;
  installment_info: string | null;
  is_paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DbRecurringRule = {
  id: string;
  family_id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  category_id: string | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  payment_method: string;
  day_of_month: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
  active: boolean;
  last_confirmed: string | null;
  starts_on: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DbGoal = {
  id: string;
  family_id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  deadline: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SyncEntity = 'category' | 'transaction' | 'recurring' | 'goal';

export type SyncOperation = 'upsert' | 'delete' | 'deposit';
