-- ============================================================================
-- AUDITORIA: Encontrar colunas candidatas a normalização
-- ============================================================================
-- Este script identifica colunas de texto que se repetem muito e podem ser
-- convertidas em tabelas de lookup (normalizadas).
--
-- COMO USAR:
-- 1. Abra: https://app.supabase.com → SQL Editor
-- 2. Cole TODO este arquivo
-- 3. Clique em "Run"
-- 4. Analise os resultados e procure por:
--    - Colunas com < 50 valores únicos = candidatas ideais
--    - Colunas com > 70% duplicação = alta prioridade
-- ============================================================================

-- PASSO 1: Listar todas as colunas de texto do banco
-- (Mostra onde procurar duplicação)
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  'Execute: SELECT COUNT(DISTINCT ' || c.column_name || ') FROM ' || t.table_name || ';' as comando_analise
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND c.data_type IN ('character varying', 'text')
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.column_name;


-- ============================================================================
-- PASSO 2: Exemplos de análise por coluna (descomente conforme necessário)
-- ============================================================================

-- Exemplo: Contar valores únicos em uma coluna
-- SELECT COUNT(DISTINCT categoria) as valores_unicos FROM config_tamanhos;
-- SELECT COUNT(*) as total_registros FROM config_tamanhos;
-- → Se valores_unicos < 50: CANDIDATA A NORMALIZAÇÃO ✅

-- Exemplo: Ver distribuição de valores em uma coluna
-- SELECT categoria, COUNT(*) as frequencia 
-- FROM config_tamanhos
-- GROUP BY categoria
-- ORDER BY frequencia DESC;

-- ============================================================================
-- PASSO 3: Após identificar um bom candidato, copie o template abaixo
-- ============================================================================

-- Template para criar tabela de lookup:
/*
-- 1. Crie a tabela de lookup
CREATE TABLE nomes_categorias (
  id BIGSERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  nome VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- 2. Insira os valores únicos existentes
INSERT INTO nomes_categorias (empresa_id, nome)
SELECT DISTINCT empresa_id, categoria FROM config_tamanhos
WHERE categoria IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Adicione FK na tabela original
ALTER TABLE config_tamanhos 
ADD COLUMN categoria_id BIGINT REFERENCES nomes_categorias(id);

-- 4. Atualize os dados
UPDATE config_tamanhos ct
SET categoria_id = nc.id
FROM nomes_categorias nc
WHERE ct.categoria = nc.nome
  AND ct.empresa_id = nc.empresa_id;

-- 5. (Opcional) Remova a coluna original após validação
-- ALTER TABLE config_tamanhos DROP COLUMN categoria;
*/