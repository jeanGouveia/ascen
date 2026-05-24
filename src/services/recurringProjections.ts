import type { RecurringRule } from '../context/RecurringContext';

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

/** Projeção desativada — lançamentos só são criados na confirmação. */
export async function syncRecurringProjectedTransactions(_rule: RuleLike): Promise<void> {
  // intencionalmente vazio
}
