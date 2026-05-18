-- Execute no SQL Editor do Supabase (projeto já em produção).
-- Corrige "Código da família não encontrado" ao entrar com join_code válido:
-- usuários autenticados não podiam dar SELECT em families antes de serem membros.

create or replace function public.lookup_family_by_join_code(p_code text)
returns table (id uuid, join_code text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := upper(trim(p_code));
  if length(normalized) < 6 then
    return;
  end if;
  return query
  select f.id, f.join_code
  from public.families f
  where upper(trim(f.join_code)) = normalized
  limit 1;
end;
$$;

revoke all on function public.lookup_family_by_join_code(text) from public;
grant execute on function public.lookup_family_by_join_code(text) to authenticated;

-- Entrada na família (evita RLS no INSERT/DELETE de family_members)
create or replace function public.join_family_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_family_id uuid;
  normalized text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Sessão inválida.';
  end if;

  normalized := upper(trim(p_code));
  if length(normalized) < 6 then
    raise exception 'Código da família não encontrado.';
  end if;

  select f.id into v_family_id
  from public.families f
  where upper(trim(f.join_code)) = normalized
  limit 1;

  if v_family_id is null then
    raise exception 'Código da família não encontrado.';
  end if;

  if exists (
    select 1 from public.family_members
    where user_id = v_user and family_id = v_family_id
  ) then
    return v_family_id;
  end if;

  delete from public.family_members where user_id = v_user;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, v_user, 'member');

  return v_family_id;
end;
$$;

revoke all on function public.join_family_by_code(text) from public;
grant execute on function public.join_family_by_code(text) to authenticated;

-- Opcional: permite upsert pelo cliente sem RPC
drop policy if exists "family_members_update_self" on public.family_members;
create policy "family_members_update_self"
  on public.family_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
