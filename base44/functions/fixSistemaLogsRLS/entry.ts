import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY'),
  { db: { schema: 'public' } }
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    // Extrai o project ref da URL (ex: https://xyzabc.supabase.co -> xyzabc)
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

    const sqls = [
      `GRANT ALL ON TABLE public.sistema_logs TO service_role;`,
      `ALTER TABLE public.sistema_logs DISABLE ROW LEVEL SECURITY;`,
    ];

    const results = [];
    for (const sql of sqls) {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      const body = await res.text();
      results.push({ sql, status: res.status, body });
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});