import type { RecurringRule } from '../context/RecurringContext';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseYearMonth(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m };
}

/** Regra vale a partir deste mês (inclusive). */
export function isRuleActiveInMonth(rule: Pick<RecurringRule, 'startsOn'>, year: number, month: number): boolean {
  const { year: sy, month: sm } = parseYearMonth(rule.startsOn);
  if (year < sy) return false;
  if (year === sy && month < sm) return false;
  return true;
}

export function isRuleActiveInCurrentMonth(rule: Pick<RecurringRule, 'startsOn'>): boolean {
  const now = new Date();
  return isRuleActiveInMonth(rule, now.getFullYear(), now.getMonth() + 1);
}

/** Data do lançamento em um mês/ano da regra (respeita startsOn). */
export function dateForRuleInMonth(
  rule: Pick<RecurringRule, 'dayOfMonth' | 'startsOn'>,
  year: number,
  month: number
): string {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(rule.dayOfMonth, lastDay);
  const candidate = `${year}-${pad(month)}-${pad(day)}`;
  return candidate >= rule.startsOn ? candidate : rule.startsOn;
}

/** Data do lançamento ao confirmar pagamento/recebimento no mês atual. */
export function confirmDateForRule(rule: Pick<RecurringRule, 'dayOfMonth' | 'startsOn'>): string {
  const now = new Date();
  return dateForRuleInMonth(rule, now.getFullYear(), now.getMonth() + 1);
}

/** Datas mensais projetadas (inclusive) de startsOn até dez do ano seguinte. */
export function buildMonthlyScheduleDates(
  rule: Pick<RecurringRule, 'dayOfMonth' | 'startsOn' | 'frequency'>,
  fromYear: number,
  toYear: number
): string[] {
  if (rule.frequency !== 'monthly') return [];
  const { year: startY, month: startM } = parseYearMonth(rule.startsOn);
  const dates: string[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y < startY || (y === startY && m < startM)) continue;
      if (!isRuleActiveInMonth(rule, y, m)) continue;
      dates.push(dateForRuleInMonth(rule, y, m));
    }
  }
  return dates;
}
