import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    const sqls = [
      `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS artigo_codigo TEXT`,
      `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS cor_codigo TEXT`,
      `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS linha_codigo TEXT`,
    ];

    const results = [];
    for (const sql of sqls) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      // Tenta via query direto no postgres
      const res2 = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      });
      results.push({ sql, status: res.status });
    }

    // Alternativa: usar supabase-js com raw SQL via from().select()
    // Melhor abordagem: retornar SQL para o usuário executar manualmente
    return Response.json({
      success: false,
      message: 'Execute o SQL abaixo diretamente no Supabase SQL Editor',
      sql: [
        'ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS artigo_codigo TEXT;',
        'ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS cor_codigo TEXT;',
        'ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS linha_codigo TEXT;',
      ].join('\n'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});