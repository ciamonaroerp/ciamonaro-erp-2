import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const sqls = [
      `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS descricao_base TEXT`,
      `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS descricao_complementar TEXT`,
      `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS codigo_pedido TEXT`,
      `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS fornecedor_id TEXT`,
    ];

    const results = [];
    for (const sql of sqls) {
      const { error } = await supabase.rpc('exec_sql', { sql }).single();
      // Se rpc não existir, tenta via postgrest
      if (error && error.message?.includes('exec_sql')) {
        results.push({ sql, status: 'rpc_not_available', note: 'Run SQL manually in Supabase dashboard' });
      } else if (error) {
        results.push({ sql, status: 'error', error: error.message });
      } else {
        results.push({ sql, status: 'ok' });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});