import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  const sqls = [
    `ALTER TABLE public.produto_comercial ADD COLUMN IF NOT EXISTS codigo VARCHAR(20)`,
    `ALTER TABLE public.produto_comercial ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE public.produto_comercial_artigo ADD COLUMN IF NOT EXISTS config_vinculo_id UUID`,
    `ALTER TABLE public.produto_comercial_artigo ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE public.produto_comercial ALTER COLUMN codigo DROP DEFAULT`,
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role`,
  ];

  const results = [];
  for (const sql of sqls) {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    results.push({ sql: sql.substring(0, 70), error: error?.message || null });
  }

  // Reload schema cache
  await supabase.rpc('reload_postgrest_schema').catch(() => null);

  return Response.json({ results });
});