import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const resultados = [];

    // 1. Remove a constraint problemática
    const r1 = await supabase.rpc('exec_ddl', {
      sql: 'ALTER TABLE public.orcamento_itens DROP CONSTRAINT IF EXISTS chk_percentual_total;'
    });
    resultados.push({ step: 'drop_constraint', error: r1.error?.message || null, ok: !r1.error });

    // Se a RPC exec_ddl não existir, cria ela primeiro
    if (r1.error?.message?.includes('Could not find')) {
      // Tenta via pg_query ou outra abordagem
      const r1b = await supabase.rpc('query', {
        q: 'ALTER TABLE public.orcamento_itens DROP CONSTRAINT IF EXISTS chk_percentual_total;'
      });
      resultados.push({ step: 'drop_constraint_alt', error: r1b.error?.message || null, ok: !r1b.error });
    }

    // 2. Verifica se consegue inserir agora
    const { error: testError } = await supabase
      .from('orcamento_itens')
      .insert({
        orcamento_id: '00000000-0000-0000-0000-000000000001',
        quantidade: 1,
        valor_unitario: 10,
        subtotal: 10,
        produto_percentual: 100,
        servico_percentual: 0
      });

    if (!testError) {
      await supabase.from('orcamento_itens').delete().eq('orcamento_id', '00000000-0000-0000-0000-000000000001');
      resultados.push({ step: 'test_insert', ok: true });
    } else {
      resultados.push({ step: 'test_insert', ok: false, error: testError.message });
    }

    return Response.json({ resultados });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});