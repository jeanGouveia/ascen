-- Corrige propagação de exclusões entre dispositivos
-- Remove filtro deleted_at IS NULL das políticas SELECT para permitir
-- que o sync engine enxerge linhas soft-deletadas durante pull
-- e possa propagar a exclusão para outros dispositivos via hard delete local

DROP POLICY IF EXISTS "goals_select_family" ON public.goals;
CREATE POLICY "goals_select_family" ON public.goals
  FOR SELECT USING (family_id = public.current_user_family_id());

DROP POLICY IF EXISTS "categories_select_family" ON public.categories;
CREATE POLICY "categories_select_family" ON public.categories
  FOR SELECT USING (family_id = public.current_user_family_id());

DROP POLICY IF EXISTS "transactions_select_family" ON public.transactions;
CREATE POLICY "transactions_select_family" ON public.transactions
  FOR SELECT USING (family_id = public.current_user_family_id());

DROP POLICY IF EXISTS "recurring_rules_select_family" ON public.recurring_rules;
CREATE POLICY "recurring_rules_select_family" ON public.recurring_rules
  FOR SELECT USING (family_id = public.current_user_family_id());
