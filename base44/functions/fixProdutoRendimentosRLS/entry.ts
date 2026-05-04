import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!SERVICE_KEY) {
      return Response.json({ 
        error: 'SUPABASE_SERVICE_KEY nao configurada. Precisa dela para criar policies RLS.',
        alternativa: 'Vamos tentar verificar o conteudo real com anon key pura primeiro.'
      }, { status: 500 });
    }

    // Usa service_role para ver dados reais (bypassa RLS)
    const supabaseSR = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Vê dados reais com service role
    const { data: rendSR, error: errSR } = await supabaseSR
      .from('produto_rendimentos')
      .select('*');

    const { data: valoresSR } = await supabaseSR
      .from('produto_rendimento_valores')
      .select('*')
      .limit(5);

    // 2. Cria policies permissivas para anon/authenticated
    const policies = [
      `DROP POLICY IF EXISTS "anon_read_produto_rendimentos" ON public.produto_rendimentos`,
      `CREATE POLICY "anon_read_produto_rendimentos" ON public.produto_rendimentos FOR ALL TO anon USING (true) WITH CHECK (true)`,
      `DROP POLICY IF EXISTS "auth_all_produto_rendimentos" ON public.produto_rendimentos`,
      `CREATE POLICY "auth_all_produto_rendimentos" ON public.produto_rendimentos FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
      `DROP POLICY IF EXISTS "anon_read_produto_rendimento_valores" ON public.produto_rendimento_valores`,
      `CREATE POLICY "anon_read_produto_rendimento_valores" ON public.produto_rendimento_valores FOR ALL TO anon USING (true) WITH CHECK (true)`,
      `DROP POLICY IF EXISTS "auth_all_produto_rendimento_valores" ON public.produto_rendimento_valores`,
      `CREATE POLICY "auth_all_produto_rendimento_valores" ON public.produto_rendimento_valores FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
    ];

    const policyResults = [];
    for (const sql of policies) {
      const { error } = await supabaseSR.rpc('exec_sql', { sql }).catch(() => ({ error: { message: 'rpc nao disponivel' } }));
      policyResults.push({ sql: sql.substring(0, 60) + '...', error: error?.message });
    }

    // 3. Verifica acesso com anon depois
    const { data: rendApos, error: errApos } = await supabaseAnon
      .from('produto_rendimentos')
      .select('*');

    return Response.json({
      service_role_dados: {
        produto_rendimentos: { count: (rendSR || []).length, lista: rendSR, erro: errSR?.message },
        produto_rendimento_valores: { count: (valoresSR || []).length, amostra: valoresSR },
      },
      policy_results: policyResults,
      anon_apos_policies: { count: (rendApos || []).length, error: errApos?.message },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});