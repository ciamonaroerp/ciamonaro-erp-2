-- ============================================================================
-- Criar tabela tabela_precos_sync com constraint única e RLS
-- ============================================================================

-- 1. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS tabela_precos_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  codigo_produto TEXT NOT NULL,
  nome_produto TEXT NOT NULL,
  artigo_id UUID,
  codigo_unico TEXT,
  descricao_artigo TEXT,
  
  -- Composições em JSON: array de { indice, itens: [{ rendimento_id, nome, valor }], valor_total }
  composicoes JSONB DEFAULT '[]'::jsonb,
  num_composicoes INTEGER DEFAULT 0,
  
  -- Rastreamento
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  sincronizado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraint única para evitar duplicatas (produto + artigo por empresa)
  CONSTRAINT unique_precos_sync UNIQUE (empresa_id, codigo_produto, codigo_unico)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tabela_precos_sync_empresa ON tabela_precos_sync(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tabela_precos_sync_produto ON tabela_precos_sync(empresa_id, codigo_produto);
CREATE INDEX IF NOT EXISTS idx_tabela_precos_sync_status ON tabela_precos_sync(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_tabela_precos_sync_sincronizado ON tabela_precos_sync(sincronizado_em DESC);

-- 3. Habilitar RLS
ALTER TABLE tabela_precos_sync ENABLE ROW LEVEL SECURITY;

-- 4. Criar policies RLS
-- Policy para leitura (usuários só veem dados da sua empresa)
CREATE POLICY "tabela_precos_sync_select" ON tabela_precos_sync
  FOR SELECT
  USING (
    empresa_id = (
      SELECT empresa_id FROM erp_usuarios 
      WHERE id = auth.uid() LIMIT 1
    )
  );

-- Policy para insert/update/delete (admin ou service role)
CREATE POLICY "tabela_precos_sync_modify" ON tabela_precos_sync
  FOR ALL
  USING (
    (SELECT perfil FROM erp_usuarios WHERE id = auth.uid() LIMIT 1) = 'Administrador'
    OR auth.uid()::text = 'service-role'
  );

-- 5. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_tabela_precos_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tabela_precos_sync_timestamp ON tabela_precos_sync;
CREATE TRIGGER trigger_tabela_precos_sync_timestamp
  BEFORE UPDATE ON tabela_precos_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_tabela_precos_sync_timestamp();

-- ============================================================================
-- Mensagens de confirmação
-- ============================================================================
-- Execute este script no Supabase SQL Editor para criar a tabela final
-- com constraint única, RLS e índices de performance.