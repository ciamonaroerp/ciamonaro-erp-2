-- AUDITORIA: PÁGINAS NÃO UTILIZADAS
-- Objetivo: Identificar dependências antes de remover

-- ============================================
-- 1. TABELAS POTENCIALMENTE ORFAS
-- ============================================

-- Tabelas ligadas a VinculosCadastroPage
SELECT 
  'vinculo_cadastro' as categoria,
  'VinculoCadastro' as entidade,
  COUNT(*) as total_registros
FROM vinculo_cadastro
UNION ALL
SELECT 
  'vinculo_cadastro',
  'ConfigTecidoVinculos',
  COUNT(*)
FROM config_tecido_vinculos
UNION ALL
SELECT 
  'vinculo_cadastro',
  'ConfigVinculos',
  COUNT(*)
FROM config_vinculos;

-- ============================================
-- 2. VERIFICAR FOREIGN KEYS E REFERÊNCIAS
-- ============================================

-- Encontrar todas as FK que apontam para tabelas de Vínculos
SELECT 
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.referential_constraints
WHERE referenced_table_name IN (
  'vinculo_cadastro',
  'config_tecido_vinculos', 
  'config_vinculos'
);

-- ============================================
-- 3. DEPENDÊNCIAS EM OUTRAS TABELAS
-- ============================================

-- Verificar se produto_comercial_artigo usa vinculo_cadastro
SELECT 
  COUNT(DISTINCT produto_id) as produtos_com_vinculos
FROM produto_comercial_artigo
WHERE vinculo_id IS NOT NULL;

-- Verificar se orcamento_itens tem referências
SELECT 
  COUNT(DISTINCT id) as orcamentos_com_vinculos
FROM orcamento_itens
WHERE config_vinculo_id IS NOT NULL OR vinculo_id IS NOT NULL;

-- ============================================
-- 4. TABELAS PARA CALCULADORA (CalculadoraPage)
-- ============================================

-- Verificar se há dados de simulações/cálculos
SELECT 
  'calculadora' as tipo,
  COUNT(*) as registros
FROM com_orcamentos
WHERE tipo_orcamento = 'simulacao' OR status = 'calculo_teste'
LIMIT 1;

-- ============================================
-- 5. SUMÁRIO FINAL
-- ============================================

-- Tabelas potencialmente afetadas
SELECT 
  'Tabelas com dados' as verificacao,
  COUNT(*) as total
FROM (
  SELECT 'vinculo_cadastro' FROM vinculo_cadastro LIMIT 1
  UNION ALL
  SELECT 'config_tecido_vinculos' FROM config_tecido_vinculos LIMIT 1
  UNION ALL
  SELECT 'config_vinculos' FROM config_vinculos LIMIT 1
  UNION ALL
  SELECT 'produto_comercial_artigo' FROM produto_comercial_artigo 
    WHERE vinculo_id IS NOT NULL LIMIT 1
  UNION ALL
  SELECT 'orcamento_itens' FROM orcamento_itens 
    WHERE config_vinculo_id IS NOT NULL LIMIT 1
) as t;