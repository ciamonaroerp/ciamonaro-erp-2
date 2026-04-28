import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: "Supabase credentials not configured" }, { status: 500 });
    }

    const sql = `
-- =============================================
-- ARQUITETURA DINÂMICA ERP - TABELAS BASE
-- =============================================

-- 1. erp_modulos: Registro de todos os módulos do ERP
CREATE TABLE IF NOT EXISTS erp_modulos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  empresa_id TEXT,
  data_criacao TIMESTAMP DEFAULT NOW()
);

-- 2. erp_entidades: Entidades (sub-recursos) de cada módulo
CREATE TABLE IF NOT EXISTS erp_entidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_slug TEXT NOT NULL,
  nome_entidade TEXT NOT NULL,
  descricao TEXT,
  empresa_id TEXT,
  data_criacao TIMESTAMP DEFAULT NOW(),
  UNIQUE(modulo_slug, nome_entidade)
);

-- 3. erp_registros: Dados reais dos módulos em formato JSONB dinâmico
CREATE TABLE IF NOT EXISTS erp_registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_slug TEXT NOT NULL,
  entidade TEXT NOT NULL,
  empresa_id TEXT,
  dados JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'ativo',
  criado_por TEXT,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW()
);

-- 4. erp_registro_historico: Histórico de alterações
CREATE TABLE IF NOT EXISTS erp_registro_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID NOT NULL,
  usuario_email TEXT,
  acao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  data_evento TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_erp_registros_modulo ON erp_registros(modulo_slug);
CREATE INDEX IF NOT EXISTS idx_erp_registros_entidade ON erp_registros(entidade);
CREATE INDEX IF NOT EXISTS idx_erp_registros_empresa ON erp_registros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_erp_registros_modulo_entidade ON erp_registros(modulo_slug, entidade);
CREATE INDEX IF NOT EXISTS idx_erp_registros_dados ON erp_registros USING GIN(dados);
CREATE INDEX IF NOT EXISTS idx_erp_historico_registro ON erp_registro_historico(registro_id);
CREATE INDEX IF NOT EXISTS idx_erp_entidades_modulo ON erp_entidades(modulo_slug);

-- Módulos padrão
INSERT INTO erp_modulos (nome, slug, descricao) VALUES
  ('Comercial', 'comercial', 'Módulo de gestão comercial e vendas'),
  ('PPCP', 'ppcp', 'Planejamento, Programação e Controle da Produção'),
  ('Logística', 'logistica', 'Módulo de gestão de logística e fretes'),
  ('Financeiro', 'financeiro', 'Módulo financeiro e contábil'),
  ('Compras', 'compras', 'Módulo de compras e fornecedores'),
  ('Estoque MP', 'estoque_mp', 'Estoque de Matéria Prima'),
  ('Estoque PA', 'estoque_pa', 'Estoque de Produto Acabado'),
  ('Produção', 'producao', 'Módulo de gestão de produção')
ON CONFLICT (slug) DO NOTHING;
    `;

    // Executa via REST API do Supabase (endpoint de RPC/query)
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    // Retorna o SQL para execução manual caso o endpoint não exista
    return Response.json({
      success: true,
      message: "Execute o SQL abaixo no Supabase Dashboard > SQL Editor para criar as tabelas dinâmicas.",
      sql
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});