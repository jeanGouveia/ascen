-- Migration: RLS Policies for goals table
-- Data: 2025-06-30
-- Objetivo: Adicionar políticas RLS para goals seguindo o padrão das tabelas sincronizadas

-- Habilitar RLS na tabela goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuário só vê goals da própria família (não deletadas)
DROP POLICY IF EXISTS "goals_select_family" ON public.goals;
CREATE POLICY "goals_select_family" ON public.goals
  FOR SELECT
  USING (
    family_id = public.current_user_family_id()
    AND deleted_at IS NULL
  );

-- INSERT: Usuário só insere goals para sua família
DROP POLICY IF EXISTS "goals_insert_family" ON public.goals;
CREATE POLICY "goals_insert_family" ON public.goals
  FOR INSERT
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

-- UPDATE: Usuário só atualiza goals da própria família
DROP POLICY IF EXISTS "goals_update_family" ON public.goals;
CREATE POLICY "goals_update_family" ON public.goals
  FOR UPDATE
  USING (
    family_id = public.current_user_family_id()
  )
  WITH CHECK (
    family_id = public.current_user_family_id()
  );

-- DELETE: Usuário só deleta goals da própria família
DROP POLICY IF EXISTS "goals_delete_family" ON public.goals;
CREATE POLICY "goals_delete_family" ON public.goals
  FOR DELETE
  USING (
    family_id = public.current_user_family_id()
  );
