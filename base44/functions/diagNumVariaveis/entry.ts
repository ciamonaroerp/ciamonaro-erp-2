import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('VITE_SUPABASE_ANON_KEY')
  );

  const { data, error } = await supabase
    .from('tabela_precos_sync')
    .select('id, codigo_produto, nome_produto, num_composicoes, tipo_produto, status, grupo_id')
    .limit(20);

  return Response.json({ data, error, total: data?.length });
});