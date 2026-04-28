-- ============================================================================
-- CRIAÇÃO DE TABELAS PARA MÓDULO DE FINANCIAMENTO
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- Tabela de Simulações de Financiamento
CREATE TABLE IF NOT EXISTS fin_simulacoes_financiamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  codigo_sequencial BIGSERIAL UNIQUE NOT NULL,
  valor_financiamento DECIMAL(15,2) NOT NULL,
  valor_entrada DECIMAL(15,2) DEFAULT 0,
  taxa_juros_mensal DECIMAL(6,4) NOT NULL,
  numero_parcelas INTEGER NOT NULL,
  data_base DATE NOT NULL,
  modo_calculo VARCHAR(50) DEFAULT 'variavel',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

-- Tabela de Parcelas da Simulação
CREATE TABLE IF NOT EXISTS fin_parcelas_simulacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulacao_id UUID NOT NULL,
  indice INTEGER NOT NULL,
  numero_parcela INTEGER,
  data_parcela DATE NOT NULL,
  valor_base DECIMAL(15,2) NOT NULL,
  juros DECIMAL(15,2) DEFAULT 0,
  valor_parcela DECIMAL(15,2) NOT NULL,
  dias_decorridos INTEGER DEFAULT 0,
  eh_intermediaria BOOLEAN DEFAULT FALSE,
  valor_especifico DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fin_parcelas_simulacao FOREIGN KEY (simulacao_id) 
    REFERENCES fin_simulacoes_financiamento(id) ON DELETE CASCADE
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_fin_simulacoes_empresa ON fin_simulacoes_financiamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fin_simulacoes_created_at ON fin_simulacoes_financiamento(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_parcelas_simulacao ON fin_parcelas_simulacao(simulacao_id);
CREATE INDEX IF NOT EXISTS idx_fin_parcelas_data ON fin_parcelas_simulacao(data_parcela);

-- Habilitar Row Level Security (RLS)
ALTER TABLE fin_simulacoes_financiamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_parcelas_simulacao ENABLE ROW LEVEL SECURITY;

-- Policies para MVP (permissivas - restringir em produção)
DROP POLICY IF EXISTS fin_sim_select_all ON fin_simulacoes_financiamento;
DROP POLICY IF EXISTS fin_sim_insert_all ON fin_simulacoes_financiamento;
DROP POLICY IF EXISTS fin_sim_update_all ON fin_simulacoes_financiamento;
DROP POLICY IF EXISTS fin_sim_delete_all ON fin_simulacoes_financiamento;

CREATE POLICY fin_sim_select_all ON fin_simulacoes_financiamento 
  FOR SELECT USING (true);

CREATE POLICY fin_sim_insert_all ON fin_simulacoes_financiamento 
  FOR INSERT WITH CHECK (true);

CREATE POLICY fin_sim_update_all ON fin_simulacoes_financiamento 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY fin_sim_delete_all ON fin_simulacoes_financiamento 
  FOR DELETE USING (true);

DROP POLICY IF EXISTS fin_parc_select_all ON fin_parcelas_simulacao;
DROP POLICY IF EXISTS fin_parc_insert_all ON fin_parcelas_simulacao;
DROP POLICY IF EXISTS fin_parc_update_all ON fin_parcelas_simulacao;
DROP POLICY IF EXISTS fin_parc_delete_all ON fin_parcelas_simulacao;

CREATE POLICY fin_parc_select_all ON fin_parcelas_simulacao 
  FOR SELECT USING (true);

CREATE POLICY fin_parc_insert_all ON fin_parcelas_simulacao 
  FOR INSERT WITH CHECK (true);

CREATE POLICY fin_parc_update_all ON fin_parcelas_simulacao 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY fin_parc_delete_all ON fin_parcelas_simulacao 
  FOR DELETE USING (true);

-- Verificar se tudo foi criado
SELECT 'Tabelas criadas com sucesso!' AS status;