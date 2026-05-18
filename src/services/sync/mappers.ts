import type { Category, Transaction, TxType } from '../../types';
import type { DbCategory, DbRecurringRule, DbTransaction } from '../../types/database';
import type { LocalRecurringRow } from '../../db/localDataDb';

export function transactionToRemote(
  row: Record<string, unknown>,
  familyId: string,
  userId: string | null
): Record<string, unknown> {
  return {
    id: row.id,
    family_id: familyId,
    created_by: userId,
    type: row.type,
    amount: Number(row.amount),
    description: row.description ?? '',
    category_id: row.category_id ?? null,
    category_name: row.category ?? row.category_name ?? '',
    category_icon: row.category_icon ?? '📦',
    category_color: row.category_color ?? '#6B7897',
    date: row.date,
    payment_method: row.payment_method ?? 'Pix',
    is_recurring: Boolean(row.is_fixed),
    is_installment: Boolean(row.is_installment),
    installment_info: row.installment_info ?? null,
    is_paid: row.is_paid === undefined ? true : Boolean(row.is_paid),
    notes: row.notes ?? null,
    updated_at: row.updated_at ?? new Date().toISOString(),
    deleted_at: row.deleted_at ?? null,
  };
}

export function categoryToRemote(
  row: Record<string, unknown>,
  familyId: string
): Record<string, unknown> {
  return {
    id: row.id,
    family_id: familyId,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    updated_at: row.updated_at ?? new Date().toISOString(),
    deleted_at: row.deleted_at ?? null,
  };
}

export function recurringToRemote(
  row: LocalRecurringRow | Record<string, unknown>,
  familyId: string
): Record<string, unknown> {
  const r = row as LocalRecurringRow;
  return {
    id: r.id,
    family_id: familyId,
    type: r.type,
    description: r.description,
    amount: Number(r.amount),
    category_id: (row as Record<string, unknown>).category_id ?? null,
    category_name: r.category,
    category_icon: r.category_icon,
    category_color: r.category_color,
    payment_method: r.payment_method,
    day_of_month: r.day_of_month,
    frequency: r.frequency,
    active: Boolean(r.active),
    last_confirmed: r.last_confirmed,
    starts_on: (row as Record<string, unknown>).starts_on ?? r.updated_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    updated_at: r.updated_at ?? new Date().toISOString(),
    deleted_at: (row as Record<string, unknown>).deleted_at ?? null,
  };
}

export function remoteToTransaction(row: DbTransaction): Transaction {
  return {
    id: row.id,
    type: row.type as TxType,
    amount: Number(row.amount),
    description: row.description,
    category: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    isFixed: row.is_recurring,
    categoryId: row.category_id ?? undefined,
    date: row.date,
    paymentMethod: row.payment_method,
    isInstallment: row.is_installment,
    installmentInfo: row.installment_info ?? undefined,
    isPaid: row.is_paid,
    notes: row.notes ?? undefined,
  };
}

export function remoteToCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    isDefault: false,
  };
}
