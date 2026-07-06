-- Função RPC para incremento atômico do valor atual de uma meta
-- Previne perda de depósitos quando múltiplos dispositivos depositam na mesma meta
-- simultaneamente antes de sincronizar entre si.

create or replace function increment_goal_current(
  p_goal_id uuid,
  p_family_id uuid,
  p_amount numeric
) returns void as $$
  update goals
  set current = current + p_amount,
      completed = (current + p_amount) >= target,
      updated_at = now()
  where id = p_goal_id and family_id = p_family_id;
$$ language sql security invoker;
