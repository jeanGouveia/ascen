-- =============================================================================
-- Ascen — schema principal (rodar no SQL Editor do Supabase)
-- Apaga estruturas antigas (household*) se existirem e recria tudo.
-- =============================================================================

-- Limpar políticas e tabelas legadas
drop policy if exists "household_snapshot_update" on storage.objects;
drop policy if exists "household_snapshot_insert" on storage.objects;
drop policy if exists "household_snapshot_select" on storage.objects;
drop policy if exists "household_members_insert_self" on public.household_members;
drop policy if exists "household_members_select" on public.household_members;
drop policy if exists "households_insert_owner" on public.households;
drop policy if exists "households_select_authenticated" on public.households;

drop table if exists public.household_members cascade;
drop table if exists public.households cascade;

-- -----------------------------------------------------------------------------
-- Perfis (espelho de auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Famílias (obrigatório: todo usuário pertence a uma)
-- -----------------------------------------------------------------------------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  join_code text not null unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id)
);

create index if not exists idx_family_members_user on public.family_members (user_id);
create index if not exists idx_families_join_code on public.families (join_code);

-- -----------------------------------------------------------------------------
-- Categorias e transações (escopo: família)
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  icon text not null default '📦',
  color text not null default '#6B7897',
  type text not null check (type in ('expense', 'income', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  description text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  category_name text not null default '',
  category_icon text not null default '📦',
  category_color text not null default '#6B7897',
  date date not null,
  payment_method text not null default 'Pix',
  is_recurring boolean not null default false,
  is_installment boolean not null default false,
  installment_info text,
  is_paid boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  category_id uuid references public.categories (id) on delete set null,
  category_name text not null default '',
  category_icon text not null default '📦',
  category_color text not null default '#6B7897',
  payment_method text not null default 'Pix',
  day_of_month int not null check (day_of_month between 1 and 31),
  frequency text not null check (frequency in ('monthly', 'weekly', 'yearly')),
  active boolean not null default true,
  last_confirmed date,
  starts_on date not null default (current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_categories_family on public.categories (family_id, updated_at);
create index if not exists idx_transactions_family_date on public.transactions (family_id, date desc);
create index if not exists idx_transactions_family_updated on public.transactions (family_id, updated_at);
create index if not exists idx_recurring_family on public.recurring_rules (family_id, updated_at);

-- -----------------------------------------------------------------------------
-- Helpers RLS
-- -----------------------------------------------------------------------------
create or replace function public.current_user_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.family_members where user_id = auth.uid();
$$;

create or replace function public.user_belongs_to_family(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where user_id = auth.uid() and family_id = fid
  );
$$;

/** Busca família pelo código de convite (antes de ser membro — RLS bloqueia SELECT direto). */
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

/** Entra na família pelo código (troca de família solo, se houver). */
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

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;

-- profiles
create policy "profiles_select_own"
  on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own"
  on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own"
  on public.profiles for update using (id = auth.uid());

-- families
create policy "families_select_member"
  on public.families for select
  using (id in (select public.current_user_family_ids()));
create policy "families_insert_owner"
  on public.families for insert
  with check (owner_id = auth.uid());
create policy "families_update_owner"
  on public.families for update
  using (owner_id = auth.uid());

-- family_members
create policy "family_members_select"
  on public.family_members for select
  using (family_id in (select public.current_user_family_ids()));
create policy "family_members_insert_self"
  on public.family_members for insert
  with check (user_id = auth.uid());
create policy "family_members_delete_self"
  on public.family_members for delete
  using (user_id = auth.uid());
create policy "family_members_update_self"
  on public.family_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- categories
create policy "categories_select"
  on public.categories for select
  using (public.user_belongs_to_family(family_id));
create policy "categories_insert"
  on public.categories for insert
  with check (public.user_belongs_to_family(family_id));
create policy "categories_update"
  on public.categories for update
  using (public.user_belongs_to_family(family_id));
create policy "categories_delete"
  on public.categories for delete
  using (public.user_belongs_to_family(family_id));

-- transactions
create policy "transactions_select"
  on public.transactions for select
  using (public.user_belongs_to_family(family_id));
create policy "transactions_insert"
  on public.transactions for insert
  with check (public.user_belongs_to_family(family_id));
create policy "transactions_update"
  on public.transactions for update
  using (public.user_belongs_to_family(family_id));
create policy "transactions_delete"
  on public.transactions for delete
  using (public.user_belongs_to_family(family_id));

-- recurring_rules
create policy "recurring_select"
  on public.recurring_rules for select
  using (public.user_belongs_to_family(family_id));
create policy "recurring_insert"
  on public.recurring_rules for insert
  with check (public.user_belongs_to_family(family_id));
create policy "recurring_update"
  on public.recurring_rules for update
  using (public.user_belongs_to_family(family_id));
create policy "recurring_delete"
  on public.recurring_rules for delete
  using (public.user_belongs_to_family(family_id));

-- -----------------------------------------------------------------------------
-- Trigger: perfil ao cadastrar
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Storage: backup cifrado por família (bucket ascen-snapshots)
-- -----------------------------------------------------------------------------
drop policy if exists "family_snapshot_select" on storage.objects;
drop policy if exists "family_snapshot_insert" on storage.objects;
drop policy if exists "family_snapshot_update" on storage.objects;

create policy "family_snapshot_select"
  on storage.objects for select
  using (
    bucket_id = 'ascen-snapshots'
    and (storage.foldername(name))[1] = 'family'
    and exists (
      select 1 from public.family_members m
      where m.user_id = auth.uid()
        and m.family_id::text = (storage.foldername(name))[2]
    )
  );

create policy "family_snapshot_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'ascen-snapshots'
    and (storage.foldername(name))[1] = 'family'
    and exists (
      select 1 from public.family_members m
      where m.user_id = auth.uid()
        and m.family_id::text = (storage.foldername(name))[2]
    )
  );

create policy "family_snapshot_update"
  on storage.objects for update
  using (
    bucket_id = 'ascen-snapshots'
    and (storage.foldername(name))[1] = 'family'
    and exists (
      select 1 from public.family_members m
      where m.user_id = auth.uid()
        and m.family_id::text = (storage.foldername(name))[2]
    )
  );
