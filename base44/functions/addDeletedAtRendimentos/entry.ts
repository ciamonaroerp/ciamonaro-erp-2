import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql: 'ALTER TABLE produto_rendimentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;' }),
    });

    // Try direct SQL via pg via supabase management if exec_sql not available
    // Fallback: use supabase client update workaround
    const text = await res.text();
    if (!res.ok) {
      // Try using supabase pg direct
      const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: 'ALTER TABLE produto_rendimentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;' }),
      });
      const pgText = await pgRes.text();
      return Response.json({ rpc_error: text, pg_result: pgText, pg_status: pgRes.status });
    }

    return Response.json({ success: true, message: 'Coluna deleted_at adicionada com sucesso.', result: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});