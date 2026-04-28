import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const empresa_id = '73045062-97e0-43b5-b95d-a1be96b4a0f2';

  const { data } = await supabase
    .from('tabela_precos_sync')
    .select('id, codigo_produto, codigo_unico, deleted_at, status, tipo_produto')
    .eq('empresa_id', empresa_id)
    .in('codigo_produto', ['P010', 'P011', 'P013'])
    .order('codigo_produto');

  return Response.json({ data });
});