-- ============================================================
-- CRM - Criação das tabelas
-- Execute este script no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_funis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  nome text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp,
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_crm_funis_deleted_at ON crm_funis (deleted_at);

CREATE TABLE IF NOT EXISTS crm_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  funil_id uuid,
  nome text NOT NULL,
  ordem int NOT NULL,
  percentual int DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp,
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_crm_etapas_deleted_at ON crm_etapas (deleted_at);

CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  titulo text NOT NULL,
  cliente_nome text,
  cliente_id uuid,
  valor numeric,
  etapa_id uuid,
  funil_id uuid,
  responsavel_id text,
  responsavel_nome text,
  status text DEFAULT 'aberto',
  motivo_perda_id uuid,
  motivo_perda_nome text,
  motivo_ganho_id uuid,
  motivo_ganho_nome text,
  orcamento_id uuid,
  observacoes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp,
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_deleted_at ON crm_oportunidades (deleted_at);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_responsavel ON crm_oportunidades (responsavel_id);

CREATE TABLE IF NOT EXISTS crm_oportunidade_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  oportunidade_id uuid,
  acao text,
  descricao text,
  usuario_id text,
  usuario_nome text,
  created_at timestamp DEFAULT now(),
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_crm_hist_deleted_at ON crm_oportunidade_historico (deleted_at);

CREATE TABLE IF NOT EXISTS crm_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  oportunidade_id uuid,
  titulo text,
  tipo text,
  data_execucao timestamp,
  status text DEFAULT 'pendente',
  responsavel_id text,
  responsavel_nome text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp,
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_crm_tarefas_deleted_at ON crm_tarefas (deleted_at);

CREATE TABLE IF NOT EXISTS crm_motivos_perda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  nome text NOT NULL,
  created_at timestamp DEFAULT now(),
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_crm_motivos_perda_deleted_at ON crm_motivos_perda (deleted_at);

CREATE TABLE IF NOT EXISTS crm_motivos_ganho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  nome text NOT NULL,
  created_at timestamp DEFAULT now(),
  deleted_at timestamp
);
CREATE INDEX IF NOT EXISTS idx_crm_motivos_ganho_deleted_at ON crm_motivos_ganho (deleted_at);

-- Permissões
GRANT SELECT, INSERT, UPDATE ON crm_funis TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_etapas TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_oportunidades TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_oportunidade_historico TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_tarefas TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_motivos_perda TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_motivos_ganho TO anon, authenticated, service_role;

-- Desabilitar RLS (controle via responsavel_id na aplicação)
ALTER TABLE crm_funis DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_etapas DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_oportunidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_oportunidade_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tarefas DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_motivos_perda DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_motivos_ganho DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Dados iniciais (substitua SEU_EMPRESA_ID pelo UUID correto)
-- ============================================================
-- INSERT INTO crm_funis (empresa_id, nome) VALUES ('SEU_EMPRESA_ID', 'Funil Principal');
-- 
-- Depois do INSERT acima, copie o ID gerado e use abaixo:
-- INSERT INTO crm_etapas (empresa_id, funil_id, nome, ordem, percentual) VALUES
--   ('SEU_EMPRESA_ID', 'FUNIL_ID', 'Prospecção', 1, 10),
--   ('SEU_EMPRESA_ID', 'FUNIL_ID', 'Qualificação', 2, 25),
--   ('SEU_EMPRESA_ID', 'FUNIL_ID', 'Proposta', 3, 50),
--   ('SEU_EMPRESA_ID', 'FUNIL_ID', 'Negociação', 4, 75),
--   ('SEU_EMPRESA_ID', 'FUNIL_ID', 'Fechamento', 5, 90);
--
-- INSERT INTO crm_motivos_perda (empresa_id, nome) VALUES
--   ('SEU_EMPRESA_ID', 'Preço alto'),
--   ('SEU_EMPRESA_ID', 'Concorrência'),
--   ('SEU_EMPRESA_ID', 'Sem necessidade'),
--   ('SEU_EMPRESA_ID', 'Sem orçamento'),
--   ('SEU_EMPRESA_ID', 'Não respondeu');
--
-- INSERT INTO crm_motivos_ganho (empresa_id, nome) VALUES
--   ('SEU_EMPRESA_ID', 'Melhor preço'),
--   ('SEU_EMPRESA_ID', 'Qualidade do produto'),
--   ('SEU_EMPRESA_ID', 'Relacionamento'),
--   ('SEU_EMPRESA_ID', 'Prazo de entrega');