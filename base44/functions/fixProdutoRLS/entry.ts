import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Testa se consegue inserir — se não, é RLS bloqueando
    const { error: testError } = await supabase
      .from('produto_comercial')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('permission')) {
      // RLS está ativo e bloqueando leitura. Isto significa que não há policies abertas.
      // A solução é usar o service role no frontend, mas como há permissão denied,
      // vamos retornar uma mensagem útil
      return Response.json({
        error: 'RLS bloqueando acesso. Tabela tem policies muito restritivas.',
        hint: 'Verifique policies de RLS em Supabase Dashboard > Authentication > Policies'
      }, { status: 403 });
    }

    return Response.json({ 
      success: true, 
      message: 'Produto tabelas acessíveis' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});