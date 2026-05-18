import type { RecurringRule } from '../context/RecurringContext';
import type { Transaction } from '../types';
import { isRuleActiveInMonth } from './recurringDates';
import { countsInMonthSummary } from './recurringTransactions';

export const MONTH_KEYS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

export const MONTH_LABELS_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export type AnnualRowKind =
  | 'opening'
  | 'closing'
  | 'income'
  | 'credit_card'
  | 'debit_card'
  | 'installment'
  | 'recurring'
  | 'other';

export type AnnualPlanRow = {
  id: string;
  kind: AnnualRowKind;
  label: string;
  /** Valores por mês (índice 0 = janeiro). Positivo = entrada, negativo = saída na linha. */
  months: number[];
  /** Linha de totais / saldo não soma na planilha de detalhe */
  isSummary?: boolean;
  indent?: boolean;
};

function emptyMonths(): number[] {
  return Array(12).fill(0);
}

function isCreditCard(pm: string): boolean {
  return /crédito|credito/i.test(pm);
}

function isDebitCard(pm: string): boolean {
  return /débito|debito/i.test(pm) && !isCreditCard(pm);
}

function parseInstallment(info?: string): { current: number; total: number } | null {
  if (!info) return null;
  const m = info.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { current: parseInt(m[1], 10), total: parseInt(m[2], 10) };
}

function monthIndex(dateStr: string, year: number): number | null {
  const [y, m] = dateStr.split('-').map(Number);
  if (y !== year || m < 1 || m > 12) return null;
  return m - 1;
}

function installmentGroupKey(tx: Transaction): string {
  const p = parseInstallment(tx.installmentInfo);
  const total = p?.total ?? 1;
  return `${tx.description.trim().toLowerCase()}__${total}`;
}

function installmentLabel(tx: Transaction, groupTxs: Transaction[]): string {
  const p = parseInstallment(tx.installmentInfo);
  const total = p?.total ?? groupTxs.length;
  const desc = tx.description.trim();
  return total > 1 ? `${desc} (${total}x)` : desc;
}

/** Projeta recorrência mensal no ano (apenas frequency monthly; a partir de startsOn). */
function recurringAmountInMonth(rule: RecurringRule, year: number, month: number): number {
  if (!rule.active || rule.frequency !== 'monthly') return 0;
  if (!isRuleActiveInMonth(rule, year, month)) return 0;
  const sign = rule.type === 'income' ? 1 : -1;
  return sign * rule.amount;
}

export type BuildAnnualPlanInput = {
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  year: number;
  /** Saldo antes de janeiro (opcional). */
  initialBalance?: number;
};

export function buildAnnualPlanSheet(input: BuildAnnualPlanInput): AnnualPlanRow[] {
  const { transactions, recurringRules, year, initialBalance = 0 } = input;
  const rows: AnnualPlanRow[] = [];

  const opening = emptyMonths();
  const closing = emptyMonths();
  const monthIncome = emptyMonths();
  const monthExpense = emptyMonths();

  for (let m = 0; m < 12; m++) {
    const summary = sumMonth(transactions, year, m + 1);
    monthIncome[m] = summary.income;
    monthExpense[m] = summary.expense;
  }

  let carry = initialBalance;
  for (let m = 0; m < 12; m++) {
    opening[m] = carry;
    closing[m] = carry + monthIncome[m] - monthExpense[m];
    carry = closing[m];
  }

  rows.push({
    id: 'opening',
    kind: 'opening',
    label: 'Saldo inicial',
    months: [...opening],
    isSummary: true,
  });

  // Entradas agregadas (linha única)
  const incomeMonths = monthIncome.map(v => v);
  if (incomeMonths.some(v => v !== 0)) {
    rows.push({
      id: 'income_total',
      kind: 'income',
      label: 'Entradas',
      months: incomeMonths,
    });
  }

  // Despesas do ano classificadas (sem duplicar transação)
  const usedTxIds = new Set<string>();
  const creditMonths = emptyMonths();
  const debitMonths = emptyMonths();
  const installmentGroups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const mi = monthIndex(tx.date, year);
    if (mi === null) continue;

    if (tx.isFixed) {
      usedTxIds.add(tx.id);
      continue;
    }

    if (tx.isInstallment) {
      const key = installmentGroupKey(tx);
      const list = installmentGroups.get(key) ?? [];
      list.push(tx);
      installmentGroups.set(key, list);
      usedTxIds.add(tx.id);
      continue;
    }

    if (isCreditCard(tx.paymentMethod)) {
      creditMonths[mi] += tx.amount;
      usedTxIds.add(tx.id);
      continue;
    }

    if (isDebitCard(tx.paymentMethod)) {
      debitMonths[mi] += tx.amount;
      usedTxIds.add(tx.id);
    }
  }

  if (creditMonths.some(v => v > 0)) {
    rows.push({
      id: 'credit_card',
      kind: 'credit_card',
      label: 'Cartão de crédito',
      months: creditMonths.map(v => -v),
    });
  }

  if (debitMonths.some(v => v > 0)) {
    rows.push({
      id: 'debit_card',
      kind: 'debit_card',
      label: 'Cartão de débito (à vista)',
      months: debitMonths.map(v => -v),
    });
  }

  for (const [, group] of installmentGroups) {
    const sample = group[0];
    const months = emptyMonths();
    for (const tx of group) {
      const mi = monthIndex(tx.date, year);
      if (mi !== null) months[mi] -= tx.amount;
    }
    rows.push({
      id: `inst_${installmentGroupKey(sample)}`,
      kind: 'installment',
      label: installmentLabel(sample, group),
      months,
      indent: true,
    });
  }

  // Recorrências: projeção mensal + meses já confirmados (não remove meses futuros ao confirmar)
  const confirmedByDesc = new Map<string, number[]>();
  for (const tx of transactions) {
    if (!tx.isFixed || usedTxIds.has(tx.id)) continue;
    const mi = monthIndex(tx.date, year);
    if (mi === null) continue;
    const key = tx.description.trim().toLowerCase();
    const months = confirmedByDesc.get(key) ?? emptyMonths();
    const sign = tx.type === 'income' ? 1 : -1;
    months[mi] += sign * tx.amount;
    confirmedByDesc.set(key, months);
    usedTxIds.add(tx.id);
  }

  for (const rule of recurringRules) {
    if (!rule.active) continue;
    const key = rule.description.trim().toLowerCase();
    const months = emptyMonths();
    for (let m = 0; m < 12; m++) {
      months[m] = recurringAmountInMonth(rule, year, m + 1);
    }
    const confirmed = confirmedByDesc.get(key);
    if (confirmed) {
      for (let m = 0; m < 12; m++) {
        if (confirmed[m] !== 0) months[m] = confirmed[m];
      }
    }
    if (!months.some(v => v !== 0)) continue;
    rows.push({
      id: `rec_${rule.id}`,
      kind: 'recurring',
      label: `↻ ${rule.description}`,
      months: [...months],
      indent: true,
    });
  }

  const otherMonths = emptyMonths();

  // Demais despesas não classificadas
  for (const tx of transactions) {
    if (tx.type !== 'expense' || usedTxIds.has(tx.id)) continue;
    const mi = monthIndex(tx.date, year);
    if (mi === null) continue;
    otherMonths[mi] += tx.amount;
  }

  if (otherMonths.some(v => v > 0)) {
    rows.push({
      id: 'other_expense',
      kind: 'other',
      label: 'Outros (Pix, dinheiro, etc.)',
      months: otherMonths.map(v => -v),
    });
  }

  rows.push({
    id: 'closing',
    kind: 'closing',
    label: 'Saldo final',
    months: [...closing],
    isSummary: true,
  });

  return rows;
}

function sumMonth(transactions: Transaction[], year: number, month: number) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const mi = monthIndex(t.date, year);
    if (mi !== month - 1) continue;
    if (!countsInMonthSummary(t)) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense };
}

export function formatPlanCell(value: number, kind?: AnnualRowKind): string {
  if (value === 0) return '—';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (kind === 'opening' || kind === 'closing') {
    return value < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
  }
  if (value > 0) return `+${formatted}`;
  return `-${formatted}`;
}
