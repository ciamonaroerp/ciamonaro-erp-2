-- ============================================================
-- CRM - Migration: adicionar colunas faltantes
-- Execute no Supabase SQL Editor caso a tabela já exista
-- ============================================================

ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS funil_id uuid;
ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS percentual int DEFAULT 0;
ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS deleted_at timestamp;

ALTER TABLE crm_funis ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE crm_funis ADD COLUMN IF NOT EXISTS deleted_at timestamp;

ALTER TABLE crm_motivos_perda ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE crm_motivos_perda ADD COLUMN IF NOT EXISTS deleted_at timestamp;

ALTER TABLE crm_motivos_ganho ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE crm_motivos_ganho ADD COLUMN IF NOT EXISTS deleted_at timestamp;

-- Garantir permissões
GRANT SELECT, INSERT, UPDATE ON crm_etapas TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_funis TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_motivos_perda TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON crm_motivos_ganho TO anon, authenticated, service_role;

ALTER TABLE crm_etapas DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_funis DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_motivos_perda DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_motivos_ganho DISABLE ROW LEVEL SECURITY;