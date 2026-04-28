import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  const sqls = [
    "ALTER TABLE tabela_precos_sync ADD COLUMN IF NOT EXISTS chave_equivalencia TEXT",
    "ALTER TABLE tabela_precos_sync ADD COLUMN IF NOT EXISTS grupo_id UUID",
    "CREATE INDEX IF NOT EXISTS idx_tps_chave ON tabela_precos_sync(empresa_id, chave_equivalencia)",
    "CREATE INDEX IF NOT EXISTS idx_tps_grupo ON tabela_precos_sync(empresa_id, grupo_id)",
  ];

  const resultados = [];
  for (const sql of sqls) {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
      resultados.push({ sql: sql.slice(0, 60), status: res.status, note: 'exec_sql indisponivel' });
    } else {
      resultados.push({ sql: sql.slice(0, 60), ok: true });
    }
  }

  return Response.json({
    resultados,
    sql_manual: sqls.join(';\n'),
  });
});