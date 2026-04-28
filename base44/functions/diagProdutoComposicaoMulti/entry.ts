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

    // Tenta inserir com apenas os campos básicos para ver o erro real
    const { data: test, error: testError } = await supabase
      .from('produto_composicao_multi')
      .insert({ produto_id: '00000000-0000-0000-0000-000000000001', empresa_id: '00000000-0000-0000-0000-000000000001', indice: 1 })
      .select();

    // Lista tudo da tabela para ver estrutura
    const { data: sample } = await supabase
      .from('produto_composicao_multi')
      .select('*')
      .limit(1);

    return Response.json({ testError: testError?.message, sample, test });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});