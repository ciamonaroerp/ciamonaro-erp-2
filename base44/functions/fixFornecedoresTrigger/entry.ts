import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Lista triggers na tabela fornecedores
  const { data: triggers, error: trigErr } = await admin.rpc('exec_sql', {
    sql: `SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'fornecedores';`
  });

  // Tenta dropar triggers conhecidos que referenciam cnpj
  const drops = [
    `DROP TRIGGER IF EXISTS set_cnpj_normalizado ON fornecedores;`,
    `DROP TRIGGER IF EXISTS normalize_cnpj ON fornecedores;`,
    `DROP TRIGGER IF EXISTS trg_fornecedores_cnpj ON fornecedores;`,
    `DROP TRIGGER IF EXISTS trigger_cnpj_normalizado ON fornecedores;`,
    `DROP TRIGGER IF EXISTS trg_cnpj ON fornecedores;`,
  ];

  const results = [];
  for (const sql of drops) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    results.push({ sql, status: resp.status });
  }

  // Tenta via admin.rpc
  const { error: e1 } = await admin.rpc('exec_sql', { sql: `DROP TRIGGER IF EXISTS set_cnpj_normalizado ON fornecedores;` });
  const { error: e2 } = await admin.rpc('exec_sql', { sql: `DROP TRIGGER IF EXISTS normalize_cnpj ON fornecedores;` });

  return Response.json({ triggers, results, errors: { e1, e2 } });
});