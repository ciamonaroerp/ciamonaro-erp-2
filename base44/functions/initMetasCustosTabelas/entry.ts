import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sb = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );

  const statements = [
    `CREATE TABLE IF NOT EXISTS metas_operacionais (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id uuid NOT NULL,
      capacidade_private_label integer NOT NULL DEFAULT 0,
      ticket_medio_private_label numeric(10,2) NOT NULL DEFAULT 0,
      capacidade_eventos integer NOT NULL DEFAULT 0,
      ticket_medio_eventos numeric(10,2) NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz
    )`,
    `CREATE INDEX IF NOT EXISTS idx_metas_operacionais_empresa ON metas_operacionais(empresa_id)`,
    `CREATE TABLE IF NOT EXISTS custos_fixos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id uuid NOT NULL,
      descricao text NOT NULL,
      percentual numeric(5,2) NOT NULL DEFAULT 0,
      tipo text NOT NULL CHECK (tipo IN ('direto','indireto')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz
    )`,
    `CREATE INDEX IF NOT EXISTS idx_custos_fixos_empresa ON custos_fixos(empresa_id)`,
    `CREATE TABLE IF NOT EXISTS despesas_variaveis (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id uuid NOT NULL,
      descricao text NOT NULL,
      percentual numeric(5,2) NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz
    )`,
    `CREATE INDEX IF NOT EXISTS idx_despesas_variaveis_empresa ON despesas_variaveis(empresa_id)`,
    `CREATE TABLE IF NOT EXISTS informacoes_financeiras (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id uuid NOT NULL,
      descricao text NOT NULL,
      percentual numeric(5,2) NOT NULL DEFAULT 0,
      tipo text NOT NULL CHECK (tipo IN ('direto','indireto')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz
    )`,
    `CREATE INDEX IF NOT EXISTS idx_info_financeiras_empresa ON informacoes_financeiras(empresa_id)`,
    `CREATE TABLE IF NOT EXISTS custos_terceiros (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id uuid NOT NULL,
      descricao text NOT NULL,
      valor numeric(10,2) NOT NULL DEFAULT 0,
      categoria text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz
    )`,
    `CREATE INDEX IF NOT EXISTS idx_custos_terceiros_empresa ON custos_terceiros(empresa_id)`,
  ];

  const results = [];
  for (const sql of statements) {
    const { error } = await sb.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: 'rpc_not_available' }));
    results.push({ sql: sql.substring(0, 60), error: error || null });
  }

  // Verifica se as tabelas foram criadas testando uma query simples
  const checks = {};
  for (const table of ['metas_operacionais', 'custos_fixos', 'despesas_variaveis', 'informacoes_financeiras', 'custos_terceiros']) {
    const { error } = await sb.from(table).select('id').limit(1);
    checks[table] = !error ? 'OK' : error.message;
  }

  return Response.json({ success: true, results, checks });
});