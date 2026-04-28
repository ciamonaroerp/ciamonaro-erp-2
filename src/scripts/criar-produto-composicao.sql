-- Adicionar coluna variavel_index se não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produto_composicao' AND column_name = 'variavel_index') THEN
        ALTER TABLE public.produto_composicao ADD COLUMN variavel_index integer DEFAULT 1;
    END IF;
END $$;

-- Remover a restrição UNIQUE antiga (empresa_id, produto_id, rendimento_id) se existir
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produto_composicao_empresa_id_produto_id_rendimento_id_key') THEN
        ALTER TABLE public.produto_composicao DROP CONSTRAINT produto_composicao_empresa_id_produto_id_rendimento_id_key;
    END IF;
END $$;

-- Adicionar a nova restrição UNIQUE com variavel_index
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produto_composicao_empresa_id_produto_id_rendimento_id_variavel_index_key') THEN
        ALTER TABLE public.produto_composicao ADD CONSTRAINT produto_composicao_empresa_id_produto_id_rendimento_id_variavel_index_key UNIQUE (empresa_id, produto_id, rendimento_id, variavel_index);
    END IF;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE public.produto_composicao ENABLE ROW LEVEL SECURITY;

-- Garantir que a política existe
CREATE POLICY IF NOT EXISTS "service_role_all" 
ON public.produto_composicao 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_produto_composicao_produto_id ON public.produto_composicao(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_composicao_empresa_id ON public.produto_composicao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produto_composicao_rendimento_id ON public.produto_composicao(rendimento_id);
CREATE INDEX IF NOT EXISTS idx_produto_composicao_variavel_index ON public.produto_composicao(variavel_index);