import * as localDb from '../db/localDataDb';
import type { RecurringRule } from '../context/RecurringContext';
import {
  buildProjectedTransaction,
  projectedDatesForRule,
  recurringRuleNote,
} from '../utils/recurringTransactions';

type RuleLike = Pick<
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

/** Cria/atualiza lançamentos previstos (não pagos) mês a mês; não remove os já confirmados. */
export async function syncRecurringProjectedTransactions(rule: RuleLike): Promise<void> {
  if (!rule.active || rule.frequency !== 'monthly') {
    await localDb.deleteUnpaidRecurringTxsForRule(rule.id);
    return;
  }

  const note = recurringRuleNote(rule.id);
  const desiredDates = projectedDatesForRule(rule);
  const desiredSet = new Set(desiredDates);
  const all = await localDb.listTransactions();
  const linked = all.filter(t => t.notes === note);

  for (const tx of linked) {
    if (tx.isPaid) continue;
    if (!desiredSet.has(tx.date)) {
      await localDb.deleteTransaction(tx.id);
    }
  }

  const occupiedDates = new Set(
    (await localDb.listTransactions())
      .filter(t => t.notes === note)
      .map(t => t.date)
  );

  for (const date of desiredDates) {
    if (occupiedDates.has(date)) continue;
    await localDb.insertTransaction(buildProjectedTransaction(rule, date));
  }
}
