import type { RecurringRule } from '../context/RecurringContext';

export type DueBill = {
  rule: RecurringRule;
  dueDate: string;
  daysUntil: number;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Contas recorrentes ativas com vencimento nos próximos N dias. */
export function getUpcomingDueBills(rules: RecurringRule[], withinDays = 7): DueBill[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const results: DueBill[] = [];

  for (const rule of rules) {
    if (!rule.active || rule.confirmedThisMonth) continue;

    let dueY = y;
    let dueM = m;
    let day = rule.dayOfMonth;
    const lastDay = new Date(y, m, 0).getDate();
    if (day > lastDay) day = lastDay;

    const due = new Date(dueY, dueM - 1, day);
    if (due < today) {
      dueM += 1;
      if (dueM > 12) {
        dueM = 1;
        dueY += 1;
      }
      const lastNext = new Date(dueY, dueM, 0).getDate();
      day = Math.min(rule.dayOfMonth, lastNext);
    }

    const dueDate = dateStr(dueY, dueM, day);
    const dueDt = new Date(dueY, dueM - 1, day);
    const daysUntil = daysBetween(today, dueDt);
    if (daysUntil >= 0 && daysUntil <= withinDays) {
      results.push({ rule, dueDate, daysUntil });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}
