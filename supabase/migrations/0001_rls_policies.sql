-- ============================================================
-- Ascen - Row Level Security (RLS) Policies
-- Data: 2025-06-25
-- Objetivo: garantir que usuário só acesse dados da família à qual pertence.
-- LGPD Art. 46 (segurança) e Art. 48 (notificação de incidentes).
-- ============================================================

-- Habilita RLS em todas as tabelas com dados de usuário.
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Função auxiliar: família do usuário atual.
-- Retorna o family_id do usuário autenticado, ou NULL.
-- SECURITY INVOKER (executa com privilégios do chamador) + STABLE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_family_id()
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT family_id
  FROM public.family_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- families
-- Usuário só vê/altera a família à qual pertence.
-- ============================================================
DROP POLICY IF EXISTS "families_select_own" ON families;
CREATE POLICY "families_select_own" ON families
  FOR SELECT
  USING (
    id = public.current_user_family_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "families_insert_owner" ON families;
CREATE POLICY "families_insert_owner" ON families
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "families_update_owner" ON families;
CREATE POLICY "families_update_owner" ON families
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Não permitir DELETE direto (soft-delete via UPDATE em deleted_at).
-- RLS não tem política DELETE = bloqueado.

-- ============================================================
-- family_members
-- Usuário só vê a própria membership.
-- Inserts e updates são feitos via RPC join_family_by_code (SECURITY DEFINER).
-- ============================================================
DROP POLICY IF EXISTS "family_members_select_own" ON family_members;
CREATE POLICY "family_members_select_own" ON family_members
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Permite INSERT apenas quando o próprio usuário está entrando como member.
-- A RPC join_family_by_code é SECURITY DEFINER e bypassa RLS.
-- Este INSERT policy protege caso alguém tente inserir diretamente.
-- IMPORTANTE: role é obrigatoriamente 'member'. Owner só pode ser criado via
-- fluxo administrativo (Edge Function, migration ou service role).
DROP POLICY IF EXISTS "family_members_insert_own" ON family_members;
CREATE POLICY "family_members_insert_own" ON family_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
  );

-- Não permitir UPDATE nem DELETE direto (apenas via RPC administrativa).

-- ============================================================
-- categories
-- ============================================================
DROP POLICY IF EXISTS "categories_select_family" ON categories;
CREATE POLICY "categories_select_family" ON categories
  FOR SELECT
  USING (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "categories_insert_family" ON categories;
CREATE POLICY "categories_insert_family" ON categories
  FOR INSERT
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "categories_update_family" ON categories;
CREATE POLICY "categories_update_family" ON categories
  FOR UPDATE
  USING (
    family_id = public.current_user_family_id()
  )
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "categories_delete_family" ON categories;
CREATE POLICY "categories_delete_family" ON categories
  FOR DELETE
  USING (
    family_id = public.current_user_family_id()
  );

-- ============================================================
-- transactions
-- ============================================================
DROP POLICY IF EXISTS "transactions_select_family" ON transactions;
CREATE POLICY "transactions_select_family" ON transactions
  FOR SELECT
  USING (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "transactions_insert_family" ON transactions;
CREATE POLICY "transactions_insert_family" ON transactions
  FOR INSERT
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "transactions_update_family" ON transactions;
CREATE POLICY "transactions_update_family" ON transactions
  FOR UPDATE
  USING (
    family_id = public.current_user_family_id()
  )
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "transactions_delete_family" ON transactions;
CREATE POLICY "transactions_delete_family" ON transactions
  FOR DELETE
  USING (
    family_id = public.current_user_family_id()
  );

-- ============================================================
-- recurring_rules
-- ============================================================
DROP POLICY IF EXISTS "recurring_rules_select_family" ON recurring_rules;
CREATE POLICY "recurring_rules_select_family" ON recurring_rules
  FOR SELECT
  USING (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "recurring_rules_insert_family" ON recurring_rules;
CREATE POLICY "recurring_rules_insert_family" ON recurring_rules
  FOR INSERT
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "recurring_rules_update_family" ON recurring_rules;
CREATE POLICY "recurring_rules_update_family" ON recurring_rules
  FOR UPDATE
  USING (
    family_id = public.current_user_family_id()
  )
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

DROP POLICY IF EXISTS "recurring_rules_delete_family" ON recurring_rules;
CREATE POLICY "recurring_rules_delete_family" ON recurring_rules
  FOR DELETE
  USING (
    family_id = public.current_user_family_id()
  );

-- ============================================================
-- profiles
-- Tabela espelho de auth.users. Cada usuário só vê/edita o próprio perfil.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- Bucket de Storage: ascen-snapshots
-- Caminho: {userId}/device-snapshot.enc  ou  family/{familyId}/device-snapshot.enc
-- Cada usuário só acessa snapshots da própria família.
-- ============================================================
-- Nota: estas policies são aplicadas via SQL do Storage do Supabase.
-- Execute no SQL Editor do painel Supabase (não no migration runner local).

CREATE POLICY "snapshots_read_own_family"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ascen-snapshots'
  AND (
    -- Caminho por usuário: {userId}/...
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Caminho por família: family/{familyId}/...
    (
      (storage.foldername(name))[1] = 'family'
      AND (storage.foldername(name))[2] = public.current_user_family_id()::text
    )
  )
);

CREATE POLICY "snapshots_write_own_family"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ascen-snapshots'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'family'
      AND (storage.foldername(name))[2] = public.current_user_family_id()::text
    )
  )
);

CREATE POLICY "snapshots_update_own_family"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ascen-snapshots'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'family'
      AND (storage.foldername(name))[2] = public.current_user_family_id()::text
    )
  )
);

CREATE POLICY "snapshots_delete_own_family"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ascen-snapshots'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'family'
      AND (storage.foldername(name))[2] = public.current_user_family_id()::text
    )
  )
);

-- ============================================================
-- Notas finais
-- ============================================================
-- 1. A função current_user_family_id() é STABLE e SECURITY INVOKER.
--    Ela é avaliada uma vez por statement (não por linha) em queries simples.
--    Para garantir performance, certifique-se de que family_members tem
--    índice em (user_id). Se não tiver:
--    CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
--
-- 2. A RPC join_family_by_code DEVE ser SECURITY DEFINER para bypassar
--    RLS durante o fluxo de join. Verifique com:
--    SELECT proname, prosecdef FROM pg_proc WHERE proname = 'join_family_by_code';
--    Se prosecdef = false, recrie a função com SECURITY DEFINER.
--
-- 3. NÃO remova a coluna deleted_at das queries do app. As policies de SELECT
--    filtram por deleted_at IS NULL automaticamente.
