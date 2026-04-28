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

    // 1️⃣ BUSCA O ITEM COMPLETO
    const rItem = await base44.functions.invoke('supabaseCRUD', {
      action: 'list',
      table: 'orcamento_itens',
      filters: { id: item_id },
      select: '*',
    });
    const items = rItem?.data?.data || rItem?.data || [];
    if (items.length === 0) {
      return Response.json({ error: 'Item não encontrado' }, { status: 404 });
    }
    const item = items[0];

    // 2️⃣ RECALCULA SOMA_ACAB_ITENS
    let soma_acab_itens = 0;
    const acabamentosIds = item.acabamentos_ids || [];
    if (Array.isArray(acabamentosIds) && acabamentosIds.length > 0) {
      const rAcab = await base44.functions.invoke('supabaseCRUD', {
        action: 'list',
        table: 'config_acabamentos',
        filters: { id: { $in: acabamentosIds } },
      });
      const acabamentos = rAcab?.data?.data || rAcab?.data || [];
      soma_acab_itens = acabamentos.reduce((acc, a) => acc + (parseFloat(a.valor_custo_unitario) || 0), 0);
    }

    // 3️⃣ RECALCULA SOMA_ITENS_ADICIONAIS
    let soma_itens_adicionais = 0;
    const itensAdicionaisData = item.itens_adicionais || item.itens_adicionais_payload || [];
    if (Array.isArray(itensAdicionaisData) && itensAdicionaisData.length > 0) {
      soma_itens_adicionais = itensAdicionaisData.reduce((acc, ia) => {
        const valor = parseFloat(ia.valor) || 0;
        return acc + valor;
      }, 0);
    }

    // 4️⃣ RECALCULA VALOR_PERSONALIZACAO + CUSTO_PERSONALIZACAO
    let valor_personalizacao = 0;
    let custo_personalizacao = 0;
    const personalizacoesData = item.personalizacoes_payload || item.personalizacoes || [];
    
    if (Array.isArray(personalizacoesData) && personalizacoesData.length > 0) {
      // Busca configs das personalizações
      const persIds = personalizacoesData.map(p => p.id || p).filter(Boolean);
      if (persIds.length > 0) {
        const rPers = await base44.functions.invoke('supabaseCRUD', {
          action: 'list',
          table: 'config_personalizacoes',
          filters: { id: { $in: persIds } },
        });
        const configs = rPers?.data?.data || rPers?.data || [];

        personalizacoesData.forEach(pData => {
          const pId = pData.id || pData;
          const cfg = configs.find(c => c.id === pId);
          if (!cfg) return;

          const dep = cfg.dependencias_pers || {};
          const inputs = pData.cores ? pData : {}; // Se tem cores/posicoes/valor_variavel
          const valorUn = parseFloat(cfg.valor_pers_un) || 0;
          const cores = dep.usa_cores ? (parseInt(inputs?.cores) || 0) : 0;
          const posicoes = dep.usa_posicoes ? (parseInt(inputs?.posicoes) || 0) : 0;
          const valorVariavel = dep.usa_valor_variavel ? (parseFloat(inputs?.valor_variavel) || 0) : 0;

          // valor_personalizacao = com valor_unitario (operacional)
          if (dep.usa_valor_unitario) {
            if (cores > 0 && posicoes > 0) valor_personalizacao += cores * posicoes * valorUn;
            else if (cores > 0) valor_personalizacao += cores * valorUn;
            else if (posicoes > 0) valor_personalizacao += posicoes * valorUn;
            else valor_personalizacao += valorUn;
          }

          // custo_personalizacao = apenas valor_variavel (digital)
          custo_personalizacao += valorVariavel;
        });
      }
    }

    // 5️⃣ ATUALIZA O ITEM NO BANCO
    console.log('[recalcularCustosOrcamentoItem] Atualizando com:', {
      soma_acab_itens,
      soma_itens_adicionais,
      valor_personalizacao,
      custo_personalizacao,
    });

    const rUpdate = await base44.functions.invoke('supabaseCRUD', {
      action: 'update',
      table: 'orcamento_itens',
      id: item_id,
      data: {
        soma_acab_itens,
        soma_itens_adicionais,
        valor_personalizacao,
        custo_personalizacao,
      },
    });

    console.log('[recalcularCustosOrcamentoItem] Update resultado:', rUpdate?.data);

    // 6️⃣ REBUSCA IMEDIATAMENTE PARA CONFIRMAR
    const rCheck = await base44.functions.invoke('supabaseCRUD', {
      action: 'list',
      table: 'orcamento_itens',
      filters: { id: item_id },
    });
    const itemAtualizado = rCheck?.data?.data?.[0] || rCheck?.data?.[0];
    console.log('[recalcularCustosOrcamentoItem] Item no banco após atualizar:', {
      soma_acab_itens: itemAtualizado?.soma_acab_itens,
      soma_itens_adicionais: itemAtualizado?.soma_itens_adicionais,
      valor_personalizacao: itemAtualizado?.valor_personalizacao,
      custo_personalizacao: itemAtualizado?.custo_personalizacao,
    });

    return Response.json({
      success: true,
      soma_acab_itens,
      soma_itens_adicionais,
      valor_personalizacao,
      custo_personalizacao,
      itemAtualizado,
    });
  } catch (error) {
    console.error('[recalcularCustosOrcamentoItem]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});