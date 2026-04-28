import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: "Supabase config missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tentar verificar RLS
    let rlsStatus = null;
    let rlsError = null;
    try {
      const rls = await supabase.rpc('get_table_rls_status', {
        table_name: 'solicitacaoppcp'
      });
      rlsStatus = rls.data;
      rlsError = rls.error;
    } catch (e) {
      rlsError = 'RLS check function not available';
    }

    // Tentar inserir um registro teste
    const testData = {
      numero_solicitacao: `TEST-${Date.now()}`,
      vendedor_email: user.email,
      artigo: 'Test',
      cor: 'Test',
      modelo: 'Test',
      quantidade: 1,
      data_entrega_cliente: new Date().toISOString().split('T')[0],
      empresa_id: Deno.env.get("VITE_EMPRESA_ID") || 'test-empresa'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('solicitacaoppcp')
      .insert([testData]);

    return Response.json({
      user_email: user.email,
      empresa_id: Deno.env.get("VITE_EMPRESA_ID"),
      rls_status: rlsStatus || 'Could not retrieve',
      rls_error: rlsError,
      test_insert: insertData,
      insert_error: insertError?.message || null,
      insert_details: insertError
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});