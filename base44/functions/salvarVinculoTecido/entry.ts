import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

Deno.serve(async (req) => {
  try {
    // Lê o body antes de criar o cliente para evitar consumo duplo do stream
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    
    const reqWithBody = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyText,
    });
    const base44 = createClientFromRequest(reqWithBody);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    
    const {
      empresa_id,
      codigo_unico,
      artigo_nome,
      cor_nome,
      linha_nome,
      artigo_codigo = null,
      cor_codigo = null,
      linha_codigo = null,
      descricao_base = '',
      descricao_complementar = '',
      descricao_comercial_unificada = null,
      fornecedor_id = null,
    } = body;

    if (!empresa_id || !codigo_unico || !artigo_nome || !cor_nome || !linha_nome) {
      return Response.json({
        error: 'Missing required fields: empresa_id, codigo_unico, artigo_nome, cor_nome, linha_nome',
      }, { status: 400 });
    }

    // Gera descrição unificada (base + complementar)
    const descricao_unificada = `${descricao_complementar || ''}${descricao_complementar ? ' ' : ''}${descricao_base || ''}`.trim();
    const fornecedor_norm = (fornecedor_id || '').replace(/\D/g, '') || null;

    // Busca por codigo_unico: UPDATE se já existe, INSERT se não existe
    const { data: porCodigo } = await supabase
      .from('config_vinculos')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('codigo_unico', codigo_unico)
      .is('deleted_at', null)
      .maybeSingle();

    const existenteId = porCodigo?.id;

    let data, error;

    if (existenteId) {
      // UPDATE: NÃO sobrescreve artigo_codigo, cor_codigo, linha_codigo
      ({ data, error } = await supabase
        .from('config_vinculos')
        .update({
          codigo_unico,
          artigo_nome,
          cor_nome,
          linha_nome,
          descricao_base,
          descricao_complementar,
          descricao_unificada,
          descricao_comercial_unificada,
          fornecedor_id: fornecedor_norm,
        })
        .eq('id', existenteId)
        .select('*')
        .single());
    } else {
      // INSERT: novo vínculo
      ({ data, error } = await supabase
        .from('config_vinculos')
        .insert({
          empresa_id,
          codigo_unico,
          artigo_nome,
          cor_nome,
          linha_nome,
          artigo_codigo,
          cor_codigo,
          linha_codigo,
          descricao_base,
          descricao_complementar,
          descricao_unificada,
          descricao_comercial_unificada,
          fornecedor_id: fornecedor_norm,
        })
        .select('*')
        .single());
    }

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // 2. Atualiza TODOS os itens das notas fiscais que tenham essa descricao_base/complementar
    //    do mesmo fornecedor, marcando como vinculado
    const { data: notas } = await supabase
      .from('nota_fiscal_importada')
      .select('id, itens, emitente_cnpj')
      .eq('empresa_id', empresa_id)
      .is('deleted_at', null);

    let notasAtualizadas = 0;
    for (const nota of (notas || [])) {
      // Filtra por fornecedor se informado
      if (fornecedor_norm) {
        const cnpjNota = (nota.emitente_cnpj || '').replace(/\D/g, '');
        if (cnpjNota !== fornecedor_norm) continue;
      }

      let itens;
      try { itens = typeof nota.itens === 'string' ? JSON.parse(nota.itens) : nota.itens; } catch { continue; }
      if (!Array.isArray(itens)) continue;

      let changed = false;
      const novosItens = itens.map(item => {
        const descBaseMatch = (item.descricao_base || '') === descricao_base;
        const descComplMatch = (item.descricao_complementar || '') === (descricao_complementar || '');
        if (descBaseMatch && descComplMatch) {
          changed = true;
          return { ...item, codigo_unico, status_vinculo: 'vinculado' };
        }
        return item;
      });

      if (changed) {
        await supabase
          .from('nota_fiscal_importada')
          .update({ itens: JSON.stringify(novosItens) })
          .eq('id', nota.id);
        notasAtualizadas++;
      }
    }

    // 3. Persiste vínculo inteligente para matching futuro de XML
    if (descricao_comercial_unificada) {
      await supabase
        .from('produto_vinculo_inteligente')
        .upsert({ descricao_xml: descricao_comercial_unificada, produto_id: data?.id || null, score: 1, origem: 'manual' }, { onConflict: 'descricao_xml' })
        .select();
    }

    console.log(`[salvarVinculoTecido] Vínculo salvo. Notas fiscais atualizadas: ${notasAtualizadas}`);

    // 4. Gera entradas de estoque
    if (notasAtualizadas > 0) {
      try {
        await base44.asServiceRole.functions.invoke('gerarEntradaEstoque', { empresa_id, codigo_unico });
      } catch (estoqueErr) {
        console.warn('[salvarVinculoTecido] Aviso ao gerar estoque:', estoqueErr.message);
      }
    }

    return Response.json({ success: true, data, notas_atualizadas: notasAtualizadas });
  } catch (error) {
    console.error('[salvarVinculoTecido] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});