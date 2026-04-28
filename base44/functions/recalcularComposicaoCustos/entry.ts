import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) {
      return Response.json({ error: 'item_id é obrigatório' }, { status: 400 });
    }

    // 1️⃣ Executa a função SQL de recalcular
    console.log(`[recalcularComposicaoCustos] Executando para item ${item_id}`);
    
    await base44.functions.invoke('supabaseCRUD', {
      action: 'raw_sql',
      sql: `SELECT fn_recalcular_composicao_custos('${item_id}')`,
    });

    // 2️⃣ Busca o item atualizado
    const rCheck = await base44.functions.invoke('supabaseCRUD', {
      action: 'list',
      table: 'orcamento_itens',
      filters: { id: item_id },
    });
    
    const itemAtualizado = rCheck?.data?.data?.[0];
    if (!itemAtualizado) {
      console.warn('[recalcularComposicaoCustos] Item não encontrado após recálculo');
      return Response.json({ error: 'Item não encontrado', success: false }, { status: 404 });
    }

    console.log('[recalcularComposicaoCustos] Item atualizado com sucesso:', {
      id: itemAtualizado.id,
      custo_acabamento: itemAtualizado.custo_acabamento,
      soma_itens_adicionais: itemAtualizado.soma_itens_adicionais,
      valor_personalizacao: itemAtualizado.valor_personalizacao,
      custo_personalizacao: itemAtualizado.custo_personalizacao,
    });

    return Response.json({
      success: true,
      data: { itemAtualizado },
    });
  } catch (error) {
    console.error('[recalcularComposicaoCustos]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});