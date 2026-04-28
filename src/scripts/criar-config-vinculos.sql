-- Criar tabela config_vinculos com imutabilidade de dados
CREATE TABLE IF NOT EXISTS public.config_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  codigo_unico UUID NOT NULL UNIQUE,
  artigo_nome_comercial VARCHAR(255) NOT NULL,
  cor_nome_comercial VARCHAR(255) NOT NULL,
  linha_comercial_nome VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_config_vinculos_empresa_id ON public.config_vinculos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_config_vinculos_codigo_unico ON public.config_vinculos(codigo_unico);
CREATE INDEX IF NOT EXISTS idx_config_vinculos_deleted_at ON public.config_vinculos(deleted_at);

-- Habilitar RLS
ALTER TABLE public.config_vinculos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "config_vinculos_select_policy" ON public.config_vinculos;
CREATE POLICY "config_vinculos_select_policy" ON public.config_vinculos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "config_vinculos_insert_policy" ON public.config_vinculos;
CREATE POLICY "config_vinculos_insert_policy" ON public.config_vinculos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "config_vinculos_update_policy" ON public.config_vinculos;
CREATE POLICY "config_vinculos_update_policy" ON public.config_vinculos
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "config_vinculos_delete_policy" ON public.config_vinculos;
CREATE POLICY "config_vinculos_delete_policy" ON public.config_vinculos
  FOR DELETE USING (true);

-- Conceder permissões
GRANT ALL ON public.config_vinculos TO authenticated;
GRANT ALL ON public.config_vinculos TO service_role;