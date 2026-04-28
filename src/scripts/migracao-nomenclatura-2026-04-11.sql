-- ============================================================================
-- MIGRAÇÃO DE NOMENCLATURA DE COLUNAS
-- Data: 2026-04-11
-- Descrição: Renomear colunas alternativas para padrão unificado
-- ============================================================================

-- PASSO 1: RENOMEAR cor_nome → nome_cor em orcamento_itens (CRÍTICO)
ALTER TABLE "orcamento_itens" RENAME COLUMN "cor_nome" TO "nome_cor";

-- PASSO 2: RENOMEAR cor_nome → nome_cor em tabela_precos_sync (CRÍTICO)
ALTER TABLE "tabela_precos_sync" RENAME COLUMN "cor_nome" TO "nome_cor";

-- PASSO 3: RENOMEAR linha_nome → nome_linha_comercial em tabela_precos_sync (CRÍTICO)
ALTER TABLE "tabela_precos_sync" RENAME COLUMN "linha_nome" TO "nome_linha_comercial";

-- ============================================================================
-- VALIDAÇÃO (execute após os 3 scripts acima para confirmar sucesso)
-- ============================================================================

-- Verificar coluna nome_cor em orcamento_itens
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'orcamento_itens' AND column_name IN ('nome_cor', 'cor_nome');

-- Verificar colunas em tabela_precos_sync
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'tabela_precos_sync' AND column_name IN ('nome_cor', 'cor_nome', 'nome_linha_comercial', 'linha_nome');

-- ============================================================================
-- ROLLBACK (se necessário - execute para desfazer as mudanças)
-- ============================================================================

-- ALTER TABLE "orcamento_itens" RENAME COLUMN "nome_cor" TO "cor_nome";
-- ALTER TABLE "tabela_precos_sync" RENAME COLUMN "nome_cor" TO "cor_nome";
-- ALTER TABLE "tabela_precos_sync" RENAME COLUMN "nome_linha_comercial" TO "linha_nome";