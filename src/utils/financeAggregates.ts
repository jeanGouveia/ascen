import type { Transaction } from '../types';
import { countsInMonthSummary } from './recurringTransactions';

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};

export type MonthBucket = MonthSummary & { month: number; label: string };

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function inYearMonth(dateStr: string, year: number, month: number): boolean {
  const [y, m] = dateStr.split('-').map(Number);
  return y === year && m === month;
}

/** Soma receitas/despesas de um mês (uma passada). */
export function getMonthSummary(transactions: Transaction[], year: number, month: number): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!inYearMonth(t.date, year, month)) continue;
    if (!countsInMonthSummary(t)) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Agregação jan–dez para um ano. */
export function getYearMonthlyBuckets(transactions: Transaction[], year: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let m = 1; m <= 12; m++) {
    const s = getMonthSummary(transactions, year, m);
    buckets.push({ ...s, month: m, label: MONTH_LABELS[m - 1] });
  }
  return buckets;
}

/** Saldo acumulado mês a mês no ano. */
export function getRunningBalances(buckets: MonthBucket[]): number[] {
  let acc = 0;
  return buckets.map(b => {
    acc += b.balance;
    return acc;
  });
}

export function filterTransactionsByMonth(
  transactions: Transaction[],
  year: number,
  month: number
): Transaction[] {
  return transactions.filter(t => inYearMonth(t.date, year, month));
}
