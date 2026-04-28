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

  const { data: vinculos, error: errBusca } = await supabase
    .from('config_vinculos')
    .select('id, codigo_unico, descricao_base')
    .eq('empresa_id', empresa_id)
    .eq('codigo_unico', 'A004C5249L002')
    .is('deleted_at', null);

  if (errBusca) return Response.json({ error: errBusca.message }, { status: 500 });
  if (!vinculos || vinculos.length === 0) return Response.json({ error: 'Vinculo A004C5249L002 nao encontrado' }, { status: 404 });

  const vinculo = vinculos[0];

  const { error: errUpdate } = await supabase
    .from('config_vinculos')
    .update({ descricao_base: 'MICRO SOLUTIO TINTO COM AMACIANTE VERDE TWIST' })
    .eq('id', vinculo.id);

  if (errUpdate) return Response.json({ error: errUpdate.message }, { status: 500 });

  return Response.json({
    sucesso: true,
    id: vinculo.id,
    descricao_base_anterior: vinculo.descricao_base,
    descricao_base_nova: 'MICRO SOLUTIO TINTO COM AMACIANTE VERDE TWIST',
  });
});