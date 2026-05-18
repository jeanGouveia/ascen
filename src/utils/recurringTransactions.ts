import type { RecurringRule } from '../context/RecurringContext';
import type { Transaction } from '../types';
import { buildMonthlyScheduleDates, parseYearMonth } from './recurringDates';

export const RECURRING_NOTE_PREFIX = 'recurring_rule:';

export function recurringRuleNote(ruleId: string): string {
  return `${RECURRING_NOTE_PREFIX}${ruleId}`;
}

export function parseRecurringRuleIdFromNotes(notes?: string | null): string | null {
  if (!notes?.startsWith(RECURRING_NOTE_PREFIX)) return null;
  return notes.slice(RECURRING_NOTE_PREFIX.length);
}

export function transactionMatchesRuleMonth(tx: Transaction, ruleId: string, yearMonth: string): boolean {
  return tx.notes === recurringRuleNote(ruleId) && tx.date.startsWith(yearMonth);
}

type RuleForSync = Pick<
  RecurringRule,
  | 'id'
  | 'type'
  | 'description'
  | 'amount'
  | 'category'
  | 'categoryIcon'
  | 'categoryColor'
  | 'paymentMethod'
  | 'dayOfMonth'
  | 'frequency'
  | 'active'
  | 'startsOn'
>;

export function buildProjectedTransaction(
  rule: RuleForSync,
  date: string
): Omit<Transaction, 'id'> {
  return {
    type: rule.type,
    amount: rule.amount,
    description: rule.description,
    category: rule.category,
    categoryIcon: rule.categoryIcon,
    categoryColor: rule.categoryColor,
    paymentMethod: rule.paymentMethod,
    date,
    isFixed: true,
    isPaid: false,
    notes: recurringRuleNote(rule.id),
  };
}

/** Datas projetadas: do início da regra até dezembro do ano seguinte. */
export function projectedDatesForRule(rule: RuleForSync): string[] {
  const startYear = parseYearMonth(rule.startsOn).year;
  const endYear = new Date().getFullYear() + 1;
  return buildMonthlyScheduleDates(rule, startYear, endYear);
}

export function countsInMonthSummary(tx: Transaction): boolean {
  if (tx.isFixed && tx.isPaid === false) return false;
  return true;
}
