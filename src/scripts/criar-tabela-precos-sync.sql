-- Tabela consolidada para sincronização com tabela de preços
-- Estrutura flat + composições em JSON para performance máxima

CREATE TABLE IF NOT EXISTS tabela_precos_sync (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  codigo_produto TEXT,
  nome_produto TEXT NOT NULL,
  artigo_id UUID,
  codigo_unico TEXT,
  descricao_artigo TEXT,
  num_composicoes INTEGER DEFAULT 0,
  composicoes JSONB DEFAULT '[]'::jsonb,
  sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tps_empresa ON tabela_precos_sync (empresa_id);
CREATE INDEX IF NOT EXISTS idx_tps_produto ON tabela_precos_sync (produto_id);
CREATE INDEX IF NOT EXISTS idx_tps_codigo_unico ON tabela_precos_sync (codigo_unico);
CREATE INDEX IF NOT EXISTS idx_tps_sincronizado ON tabela_precos_sync (sincronizado_em);

-- RLS
ALTER TABLE tabela_precos_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON tabela_precos_sync
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE tabela_precos_sync IS 'Tabela consolidada de sincronização para formação de preços. 1 registro por produto+artigo.';