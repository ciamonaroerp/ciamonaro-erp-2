import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: "Supabase config ou Service Key missing" }, { status: 500 });
    }

    // Usar service role para contornar RLS
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    // Testar se conseguimos inserir com a service role
    const testInsert = await supabase
      .from('solicitacaoppcp')
      .insert({
        numero_solicitacao: 'TEST-' + Date.now(),
        vendedor_email: user.email,
        artigo: 'Test',
        cor: 'Test',
        modelo: 'Test',
        quantidade: 1,
        data_entrega_cliente: new Date().toISOString().split('T')[0],
        empresa_id: Deno.env.get("VITE_EMPRESA_ID")
      })
      .select();

    if (testInsert.error) {
      return Response.json({
        message: 'Service Role ainda não consegue inserir',
        error: testInsert.error.message,
        code: testInsert.error.code,
        details: testInsert.error.details,
        hint: 'RLS ainda está ativo. Execute em Supabase > SQL Editor: ALTER TABLE solicitacaoppcp DISABLE ROW LEVEL SECURITY;'
      });
    }

    // Se chegou aqui, conseguiu inserir. Deletar registro de teste
    await supabase
      .from('solicitacaoppcp')
      .delete()
      .eq('numero_solicitacao', testInsert.data[0].numero_solicitacao);

    return Response.json({
      message: 'Sucesso! RLS foi contornado via Service Role',
      status: 'working',
      next_step: 'Agora você consegue criar solicitações normalmente'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});