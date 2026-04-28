import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { empresa_id, item, vinculo } = await req.json();

    if (!empresa_id || !item) {
      return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    const codigo_unico = vinculo?.codigo_unico || null;
    const numero_nf = item.numero_nf || null;
    const chave_danfe = item.chave_danfe || null;
    const data_emissao = item.data_emissao || new Date().toISOString();
    const valor_unitario = parseFloat(item.vUnCom || item.valor_unitario || 0);
    const quantidade = parseFloat(item.qCom || item.quantidade || 0);
    const valor_total = parseFloat(item.vItem || item.valor_total || (quantidade * valor_unitario));
    const unidade = item.uCom || item.unidade || null;
    const descricao_original = item.xProd || item.descricao_original || '';
    const fornecedor_nome = item.fornecedor_nome || null;
    const codigo_produto = vinculo?.codigo_produto || null;

    // Inserir sempre (sem validação de duplicidade que bloquearia o fluxo)
    const payload = {
      empresa_id,
      codigo_produto,
      codigo_unico,
      descricao_original,
      fornecedor_nome,
      numero_nf,
      chave_danfe,
      data_emissao,
      valor_unitario,
      quantidade,
      valor_total,
      unidade,
      criado_em: new Date().toISOString()
    };

    const res = await base44.asServiceRole.entities.HistoricoPrecosProduto.create(payload).catch(() => {
      // Se falhar, tenta via supabaseCRUD como fallback
      return base44.functions.invoke('supabaseCRUD', {
        action: 'create',
        table: 'historico_precos_produto',
        payload
      });
    });

    // NUNCA bloqueia o fluxo principal — sempre retorna sucesso
    return Response.json({ 
      success: true,
      message: 'Histórico registrado',
      codigo_unico,
      numero_nf 
    });
  } catch (error) {
    // Log silencioso — não interrompe fluxo
    console.warn('[HistóricoPreço] Erro não bloqueante:', error.message);
    return Response.json({ 
      success: true,
      message: 'Histórico não registrado, fluxo continua' 
    });
  }
});