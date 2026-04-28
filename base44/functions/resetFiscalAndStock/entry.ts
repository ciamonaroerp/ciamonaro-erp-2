import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const empresa_id = Deno.env.get('VITE_EMPRESA_ID');

    // Limpa notas fiscais
    const resNfe = await supabaseAdmin
      .from('nota_fiscal_importada')
      .delete()
      .eq('empresa_id', empresa_id);

    // Limpa movimentações de estoque
    const resMov = await supabaseAdmin
      .from('estoque_movimentacoes')
      .delete()
      .eq('empresa_id', empresa_id);

    // Limpa saldos de estoque
    const resSaldo = await supabaseAdmin
      .from('estoque_saldo')
      .delete()
      .eq('empresa_id', empresa_id);

    console.log('[resetFiscalAndStock] Limpeza concluída', { nfe: resNfe.count, movimentacoes: resMov.count, saldos: resSaldo.count });

    return Response.json({
      success: true,
      deleted: {
        notas_fiscais: resNfe.count || 0,
        movimentacoes: resMov.count || 0,
        saldos: resSaldo.count || 0,
      },
    });
  } catch (error) {
    console.error('[resetFiscalAndStock] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});