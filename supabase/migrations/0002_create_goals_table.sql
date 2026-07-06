-- Migration: Create goals table
-- Data: 2025-06-30
-- Objetivo: Adicionar tabela goals para sincronização de metas financeiras

-- Criar tabela goals seguindo o padrão das tabelas sincronizadas
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  target NUMERIC NOT NULL,
  current NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índice para performance em queries por família (padrão das outras tabelas)
CREATE INDEX IF NOT EXISTS idx_goals_family_id ON public.goals(family_id) WHERE deleted_at IS NULL;

-- Trigger para atualizar updated_at automaticamente (reutilizar função existente se possível)
-- Verificar se a função já existe antes de criar
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $function$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $function$;
END $$;

-- Criar trigger para goals
DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
