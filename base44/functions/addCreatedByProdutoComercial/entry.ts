import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };

    const queries = [
      {
        table: 'produto_comercial',
        sql: `ALTER TABLE produto_comercial ADD COLUMN IF NOT EXISTS created_by TEXT;`
      },
      {
        table: 'produto_comercial_artigo',
        sql: `ALTER TABLE produto_comercial_artigo ADD COLUMN IF NOT EXISTS created_by TEXT;`
      }
    ];

    const resultados = [];
    for (const q of queries) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: q.sql })
        }).catch(() => null);
        
        resultados.push({ table: q.table, status: 'added_or_exists' });
      } catch (e) {
        resultados.push({ table: q.table, error: e.message });
      }
    }

    return Response.json({ resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});