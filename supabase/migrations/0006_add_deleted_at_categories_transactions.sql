-- Adicionar deleted_at às tabelas categories e transactions
-- Para permitir soft delete e propagação de exclusões entre dispositivos

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_categories_family_id_deleted ON public.categories(family_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_family_id_deleted ON public.transactions(family_id) WHERE deleted_at IS NULL;
