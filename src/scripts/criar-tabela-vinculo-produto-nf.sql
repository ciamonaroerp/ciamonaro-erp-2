-- ================================================================
-- Tabela: vinculo_produto_nf
-- Objetivo: Armazenar aprendizado de vínculos entre descrições
--           de NF-e e produtos internos (codigo_unico).
-- Executar no Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS vinculo_produto_nf (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id text NOT NULL,
  fornecedor_id text NOT NULL,                  -- CNPJ sem máscara
  descricao_nf text,                            -- Descrição original da NF
  descricao_normalizada text NOT NULL,          -- Descrição normalizada (lowercase, sem acentos)
  codigo_unico text NOT NULL,                   -- Código interno do produto
  score numeric DEFAULT 1,                      -- Score do vínculo (0-1)
  origem text DEFAULT 'auto'
    CHECK (origem IN ('auto', 'manual', 'historico')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_vinculo_nf UNIQUE (empresa_id, fornecedor_id, descricao_normalizada)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_vnf_empresa_forn_desc
  ON vinculo_produto_nf(empresa_id, fornecedor_id, descricao_normalizada);

CREATE INDEX IF NOT EXISTS idx_vnf_codigo_unico
  ON vinculo_produto_nf(codigo_unico);

-- Permissões
GRANT SELECT, INSERT, UPDATE ON vinculo_produto_nf TO authenticated;
GRANT SELECT, INSERT, UPDATE ON vinculo_produto_nf TO service_role;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION update_vinculo_nf_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vinculo_nf_updated_at ON vinculo_produto_nf;
CREATE TRIGGER trg_vinculo_nf_updated_at
  BEFORE UPDATE ON vinculo_produto_nf
  FOR EACH ROW EXECUTE FUNCTION update_vinculo_nf_updated_at();