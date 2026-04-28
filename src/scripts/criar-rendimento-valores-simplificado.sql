-- ============================================================================
-- Tabela: produto_rendimento_valores
-- Estrutura simplificada para consumo por composição
-- Campos: produto_id, variavel_index, valor_total
-- ============================================================================

-- 1. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS produto_rendimento_valores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  variavel_index INTEGER NOT NULL,
  valor_total NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_produto_variavel UNIQUE(empresa_id, produto_id, variavel_index),
  CONSTRAINT fk_empresa FOREIGN KEY(empresa_id) REFERENCES public.empresas(id),
  CONSTRAINT fk_produto FOREIGN KEY(produto_id) REFERENCES public.produto_comercial(id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_produto_rendimento_valores_empresa ON produto_rendimento_valores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produto_rendimento_valores_produto ON produto_rendimento_valores(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_rendimento_valores_variavel ON produto_rendimento_valores(variavel_index);

-- 3. Habilitir RLS
ALTER TABLE produto_rendimento_valores ENABLE ROW LEVEL SECURITY;

-- 4. Policy de leitura (service_role pode tudo)
DROP POLICY IF NOT EXISTS "Acesso total service_role" ON produto_rendimento_valores;
CREATE POLICY "Acesso total service_role" 
  ON produto_rendimento_valores
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- 5. Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_produto_rendimento_valores_timestamp ON produto_rendimento_valores;
DROP FUNCTION IF EXISTS update_produto_rendimento_valores_timestamp();

CREATE FUNCTION update_produto_rendimento_valores_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_produto_rendimento_valores_timestamp
BEFORE UPDATE ON produto_rendimento_valores
FOR EACH ROW
EXECUTE FUNCTION update_produto_rendimento_valores_timestamp();

-- ============================================================================
-- Comentários (Documentação)
-- ============================================================================
COMMENT ON TABLE produto_rendimento_valores IS 'Consumo total por composição (variável) do produto. Armazena apenas o valor agregado.';
COMMENT ON COLUMN produto_rendimento_valores.produto_id IS 'Referência ao produto comercial';
COMMENT ON COLUMN produto_rendimento_valores.variavel_index IS 'Índice da composição (1 a 9)';
COMMENT ON COLUMN produto_rendimento_valores.valor_total IS 'Consumo total da composição (kg, unidade base)';