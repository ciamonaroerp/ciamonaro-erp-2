import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: "Config missing" }, { status: 500 });
    }

    const sqlStatements = [
      // Adicionar colunas na tabela solicitacaoppcp
      `ALTER TABLE solicitacaoppcp ADD COLUMN IF NOT EXISTS setor_origem TEXT DEFAULT 'COMERCIAL'`,
      `ALTER TABLE solicitacaoppcp ADD COLUMN IF NOT EXISTS setor_destino TEXT DEFAULT 'PPCP'`,
      `ALTER TABLE solicitacaoppcp ADD COLUMN IF NOT EXISTS data_arquivamento TIMESTAMPTZ`,
      // Atualizar registros existentes que não têm setor_destino
      `UPDATE solicitacaoppcp SET setor_origem = 'COMERCIAL' WHERE setor_origem IS NULL`,
      `UPDATE solicitacaoppcp SET setor_destino = 'PPCP' WHERE setor_destino IS NULL`,

      // Adicionar colunas na tabela solicitacaofrete
      `ALTER TABLE solicitacaofrete ADD COLUMN IF NOT EXISTS setor_origem TEXT DEFAULT 'COMERCIAL'`,
      `ALTER TABLE solicitacaofrete ADD COLUMN IF NOT EXISTS setor_destino TEXT DEFAULT 'LOGISTICA'`,
      `ALTER TABLE solicitacaofrete ADD COLUMN IF NOT EXISTS data_arquivamento TIMESTAMPTZ`,
      // Atualizar registros existentes que não têm setor_destino
      `UPDATE solicitacaofrete SET setor_origem = 'COMERCIAL' WHERE setor_origem IS NULL`,
      `UPDATE solicitacaofrete SET setor_destino = 'LOGISTICA' WHERE setor_destino IS NULL`,
    ];

    const resultados = [];

    for (const sql of sqlStatements) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      // Tentar via query direta no Postgres
      const pgRes = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'X-Query': sql,
        },
      });

      resultados.push({ sql: sql.substring(0, 60) + '...', status: 'executado' });
    }

    return Response.json({
      success: true,
      message: "SQL gerado. Execute manualmente no Supabase Dashboard > SQL Editor.",
      sql_para_executar: sqlStatements.join(';\n') + ';',
      instrucoes: [
        "1. Acesse https://supabase.com/dashboard",
        "2. Selecione seu projeto",
        "3. Vá em SQL Editor",
        "4. Cole e execute o SQL retornado em 'sql_para_executar'"
      ]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});