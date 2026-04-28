import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { empresa_id, descricao_base, descricao_complementar, descricao_unificada, fornecedor_id, codigo_unico, artigo_nome_comercial, cor_nome_comercial, qtd_vinculos } = await req.json();

    if (!empresa_id || !descricao_base || !codigo_unico) {
      return Response.json({ error: 'empresa_id, descricao_base e codigo_unico são obrigatórios' }, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const t0 = Date.now();
    const normCNPJ = (s) => (s || '').replace(/\D/g, '');

    // Constrói descricao_unificada do parâmetro para busca
    const descricaoUnificadaParam = descricao_complementar && descricao_base
      ? `${descricao_complementar} ${descricao_base}`
      : (descricao_complementar || descricao_base || null);

    // LÓGICA MELHORADA: Busca o config_vinculos usando descricao_unificada + fornecedor_id
    // para validar se o codigo_unico já existe nessas condições
    let codigoUnicoExistente = null;
    if (descricaoUnificadaParam && fornecedor_id) {
      const { data: configMatch } = await supabase
        .from('config_vinculos')
        .select('codigo_unico')
        .eq('empresa_id', empresa_id)
        .eq('descricao_comercial_unificada', descricaoUnificadaParam)
        .eq('fornecedor_id', normCNPJ(fornecedor_id))
        .is('deleted_at', null)
        .maybeSingle();
      
      // Se encontrou um config_vinculos com descricao_comercial_unificada + fornecedor_id iguais,
      // mas o codigo_unico passado é diferente, usa o encontrado (evita duplicatas)
      if (configMatch?.codigo_unico && configMatch.codigo_unico !== codigo_unico) {
        codigoUnicoExistente = configMatch.codigo_unico;
      }
    }

    const codigoUnicoFinal = codigoUnicoExistente || codigo_unico;

    // Busca todas as NFe da empresa
    const { data: notas, error: listError } = await supabase
      .from('nota_fiscal_importada')
      .select('id, itens, emitente_cnpj')
      .eq('empresa_id', empresa_id);

    if (listError) return Response.json({ error: listError.message }, { status: 500 });

    let totalUpdated = 0;
    const updates = [];
    const itensNaoVinculados = []; // Rastreia itens que não puderam ser vinculados automaticamente

    // Busca descricao_comercial_unificada do vinculo para comparação
    const { data: vinculoRef } = await supabase
      .from('config_vinculos')
      .select('descricao_comercial_unificada')
      .eq('empresa_id', empresa_id)
      .eq('codigo_unico', codigoUnicoFinal)
      .is('deleted_at', null)
      .maybeSingle();

    for (const nota of (notas || [])) {
      let itens;
      try { itens = typeof nota.itens === 'string' ? JSON.parse(nota.itens) : nota.itens; } catch { continue; }
      if (!Array.isArray(itens)) continue;

      let changed = false;
      const novosItens = itens.map(item => {
        if (item.codigo_unico) return item; // já vinculado

        // Tenta vincular por descricao_comercial_unificada
        const descricaoUnificadaItem = `${item.descricao_complementar || ''} ${item.descricao_base || ''}`.trim();
        const descricaoComercialUnificada = vinculoRef?.descricao_comercial_unificada || descricaoUnificadaParam;

        const matchDesc = descricaoUnificadaItem === descricaoComercialUnificada;
        const matchFornecedor = !fornecedor_id || normCNPJ(nota.emitente_cnpj) === normCNPJ(fornecedor_id);

        if (matchDesc && matchFornecedor) {
          changed = true;
          totalUpdated++;
          return { ...item, codigo_unico: codigoUnicoFinal, status_vinculo: 'vinculado' };
        }

        // Registra item não vinculado
        itensNaoVinculados.push({
          nota_id: nota.id,
          emitente_cnpj: nota.emitente_cnpj,
          emitente_nome: nota.emitente_nome,
          descricao_base: item.descricao_base,
          descricao_complementar: item.descricao_complementar,
          quantidade: item.quantidade,
          codigo_pedido: item.codigo_pedido,
        });

        return item;
      });

      // Adiciona NFe à lista de updates se houve mudança
      if (changed) {
        updates.push({ id: nota.id, itens: novosItens });
      }
      }

    // Atualiza NFe em lote
    for (const upd of updates) {
      await supabase
        .from('nota_fiscal_importada')
        .update({ itens: upd.itens })
        .eq('id', upd.id);
    }

    // Atualiza historico_precos_produto_erp onde codigo_unico ainda é nulo
    const { data: historicoSemVinculo } = await supabase
      .from('historico_precos_produto_erp')
      .select('id, dados_danfe, descricao_original')
      .eq('empresa_id', empresa_id)
      .is('codigo_unico', null);

    for (const registro of (historicoSemVinculo || [])) {
      const danfe = typeof registro.dados_danfe === 'string'
        ? JSON.parse(registro.dados_danfe || '{}')
        : (registro.dados_danfe || {});

      const descBase = danfe.descricao_base || registro.descricao_original || '';
      const descComp = danfe.descricao_complementar || '';

      const matchBase = descBase === descricao_base;
      const matchComp = !descricao_complementar || descComp === descricao_complementar;

      if (matchBase && matchComp) {
        await supabase
          .from('historico_precos_produto_erp')
          .update({ codigo_unico: codigoUnicoFinal })
          .eq('id', registro.id);
      }
    }

    // Salva descricao_base + fornecedor_id no config_vinculos correspondente
    const { data: vinculo } = await supabase
      .from('config_vinculos')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('codigo_unico', codigoUnicoFinal)
      .is('deleted_at', null)
      .maybeSingle();

    if (vinculo?.id) {
      await supabase
        .from('config_vinculos')
        .update({
          descricao_base: descricao_base || null,
          descricao_complementar: descricao_complementar || null,
          descricao_unificada: descricaoUnificadaParam || descricao_unificada || null,
          fornecedor_id: normCNPJ(fornecedor_id) || null,
          artigo_nome_comercial: artigo_nome_comercial || null,
          cor_nome_comercial: cor_nome_comercial || null,
          qtd_vinculos: (qtd_vinculos || 1),
        })
        .eq('id', vinculo.id);
    }

    const duration = Date.now() - t0;

    // Gera entradas de estoque APENAS para itens vinculados
    let estoqueResult = null;
    if (totalUpdated > 0) {
      try {
        const estoqueResp = await base44.asServiceRole.functions.invoke('gerarEntradaEstoque', {
          empresa_id,
          codigo_unico: codigoUnicoFinal,
        });
        estoqueResult = estoqueResp;
      } catch (estoqueErr) {
        console.error('Erro ao gerar estoque:', estoqueErr.message);
      }
    }

    return Response.json({ 
      success: true, 
      notas_atualizadas: updates.length, 
      itens_atualizados: totalUpdated, 
      duration_ms: duration, 
      codigo_unico_utilizado: codigoUnicoFinal, 
      estoque: estoqueResult,
      itens_nao_vinculados: itensNaoVinculados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});