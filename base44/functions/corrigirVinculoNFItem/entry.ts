import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { empresa_id, chave_danfe, numero_item, codigo_unico_novo } = await req.json();

    if (!empresa_id || !chave_danfe || numero_item === undefined || !codigo_unico_novo) {
      return Response.json({ error: 'Parâmetros obrigatórios: empresa_id, chave_danfe, numero_item, codigo_unico_novo' }, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Busca a NFe e o vínculo anterior
    const { data: nota, error: notaError } = await supabase
      .from('nota_fiscal_importada')
      .select('id, itens, codigo_unico_anterior:itens')
      .eq('empresa_id', empresa_id)
      .eq('chave_danfe', chave_danfe)
      .maybeSingle();

    if (notaError || !nota) return Response.json({ error: 'NF não encontrada' }, { status: 404 });

    let itens;
    try { itens = typeof nota.itens === 'string' ? JSON.parse(nota.itens) : nota.itens; } catch {
      return Response.json({ error: 'Erro ao parsear itens da NF' }, { status: 500 });
    }

    if (!Array.isArray(itens) || !itens[numero_item]) {
      return Response.json({ error: `Item ${numero_item} não encontrado` }, { status: 404 });
    }

    const itemAntigo = itens[numero_item];
    const codigoUntigoAnterior = itemAntigo.codigo_unico;

    // 2. Atualiza o item com o novo código_unico
    itens[numero_item].codigo_unico = codigo_unico_novo;
    itens[numero_item].status_vinculo = 'vinculado';

    await supabase
      .from('nota_fiscal_importada')
      .update({ itens: JSON.stringify(itens) })
      .eq('id', nota.id);

    // 3. Remove movimentações de estoque antigas do código anterior
    if (codigoUntigoAnterior) {
      await supabase
        .from('estoque_movimentacoes')
        .delete()
        .eq('empresa_id', empresa_id)
        .eq('codigo_unico', codigoUntigoAnterior)
        .eq('tipo_movimento', 'ENTRADA_XML')
        .like('descricao', `%${chave_danfe}%`);
    }

    // 4. Regenera entrada de estoque com o novo código
    let estoqueResult = null;
    try {
      const estoqueResp = await base44.asServiceRole.functions.invoke('gerarEntradaEstoque', {
        empresa_id,
        codigo_unico: codigo_unico_novo,
      });
      estoqueResult = estoqueResp;
    } catch (estoqueErr) {
      console.error('Erro ao regenerar estoque:', estoqueErr.message);
    }

    // 5. Log da correção
    try {
      await supabase.from('sistema_logs').insert({
        empresa_id,
        usuario_email: user.email,
        modulo: 'Fiscal',
        acao: 'CORRIGIR_VINCULO_ITEM',
        mensagem_erro: null,
        dados_erro: JSON.stringify({
          chave_danfe,
          numero_item,
          codigo_unico_anterior: codigoUntigoAnterior,
          codigo_unico_novo,
          estoque: estoqueResult
        }),
        nivel: 'INFO',
        created_at: new Date().toISOString()
      });
    } catch (_) {}

    return Response.json({ 
      success: true, 
      codigo_unico_anterior: codigoUntigoAnterior,
      codigo_unico_novo,
      estoque: estoqueResult 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});