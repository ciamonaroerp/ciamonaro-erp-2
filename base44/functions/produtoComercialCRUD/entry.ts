import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, empresa_id, dados, filtros } = body;
    const id = body.id || body.artigo_id;

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    if (action === 'create_produto') {
      const { data: existentes } = await supabase
        .from('produto_comercial')
        .select('codigo')
        .eq('empresa_id', empresa_id);

      const numeros = (existentes || []).map(p => {
        const match = p.codigo?.match(/^P(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
      const max = numeros.length > 0 ? Math.max(...numeros) : 0;
      const codigo = `P${String(max + 1).padStart(3, '0')}`;

      // Map variáveis to num_variaveis for DB storage
      const insertData = { ...dados, empresa_id };
      if (insertData['variáveis']) {
        insertData.num_variaveis = insertData['variáveis'];
      }
      delete insertData['variáveis'];
      delete insertData['variaveis'];

      // Step 1: insert without codigo to avoid sequence permission issues
      const { data: inserted, error: insertError } = await supabase
        .from('produto_comercial')
        .insert(insertData)
        .select()
        .single();

      if (insertError) return Response.json({ error: insertError.message, code: insertError.code }, { status: 400 });

      // Step 2: update with our custom codigo
      const { data, error: updateError } = await supabase
        .from('produto_comercial')
        .update({ codigo })
        .eq('id', inserted.id)
        .select()
        .single();

      if (updateError) return Response.json({ error: updateError.message, code: updateError.code }, { status: 400 });

      // Step 3: Se num_variaveis >= 2, marca tipo_produto = 'composto' em tabela_precos_sync
      if (insertData.num_variaveis >= 2 && codigo) {
        await supabase
          .from('tabela_precos_sync')
          .update({ tipo_produto: 'composto' })
          .eq('codigo_produto', codigo)
          .eq('empresa_id', empresa_id);
      }

      return Response.json({ data });
    }

    if (action === 'update_produto') {
      // Only allow known DB columns to prevent PGRST204 errors
      const ALLOWED_FIELDS = ['nome_produto', 'descricao', 'status', 'num_variaveis', 'deleted_at', 'codigo'];
      const updateData = {};
      ALLOWED_FIELDS.forEach(f => { if (dados[f] !== undefined) updateData[f] = dados[f]; });
      if (dados['variáveis']) updateData.num_variaveis = dados['variáveis'];

      const { data, error } = await supabase
        .from('produto_comercial')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 400 });

      // Se num_variaveis >= 2, marca tipo_produto = 'composto' em tabela_precos_sync
      if (updateData.num_variaveis >= 2 && data?.codigo) {
        await supabase
          .from('tabela_precos_sync')
          .update({ tipo_produto: 'composto' })
          .eq('codigo_produto', data.codigo)
          .eq('empresa_id', data.empresa_id);
      } else if (updateData.num_variaveis === 1 && data?.codigo) {
        await supabase
          .from('tabela_precos_sync')
          .update({ tipo_produto: 'simples' })
          .eq('codigo_produto', data.codigo)
          .eq('empresa_id', data.empresa_id);
      }

      return Response.json({ data });
    }

    if (action === 'list_produtos') {
      const { data, error } = await supabase
        .from('produto_comercial')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('codigo', { ascending: true, nullsFirst: false });

      if (error) return Response.json({ error: error.message }, { status: 400 });
      // Map num_variaveis back to variáveis for frontend
      const mappedData = (data || []).map(p => ({
        ...p,
        variáveis: p.num_variaveis || 1
      }));
      return Response.json({ data: mappedData });
    }

    if (action === 'create_artigo') {
      const { vinculo_id, codigo_unico, artigo_codigo } = dados;
      const variavel_index = dados.variavel_index ?? 1;
      const { data, error } = await supabase
        .from('produto_comercial_artigo')
        .insert({ empresa_id, produto_id: dados.produto_id, vinculo_id, codigo_unico, artigo_codigo: artigo_codigo || null, variavel_index })
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 400 });

      // Sincronizar produto após criar artigo
      const { data: produtoData } = await supabase.from('produto_comercial').select('codigo').eq('id', dados.produto_id).single();
      if (produtoData?.codigo) {
        console.log('[create_artigo] dados inseridos:', { vinculo_id, codigo_unico, variavel_index });
        const syncRes = await base44.asServiceRole.functions.invoke('sincronizarTabelaPrecos', {
          empresa_id,
          codigo_produto: produtoData.codigo,
        });
        console.log('[create_artigo] sincronizado:', syncRes.data?.success || false);
      }

      return Response.json({ data });
    }

    if (action === 'list_artigos') {
      const { data: artigosRaw, error } = await supabase
        .from('produto_comercial_artigo')
        .select('id, produto_id, vinculo_id, codigo_unico, artigo_codigo, variavel_index')
        .eq('produto_id', filtros?.produto_id)
        .is('deleted_at', null);

      if (error) return Response.json({ error: error.message }, { status: 400 });

      // Enrich with config_vinculos data
      const vinculoIds = [...new Set((artigosRaw || []).map(a => a.vinculo_id).filter(Boolean))];
      let vinculosMap = {};
      if (vinculoIds.length > 0) {
        const { data: vData } = await supabase
          .from('config_vinculos')
          .select('id, artigo_nome, cor_nome, linha_nome')
          .in('id', vinculoIds);
        (vData || []).forEach(v => { vinculosMap[v.id] = v; });
      }

      const data = (artigosRaw || []).map(a => {
        const v = vinculosMap[a.vinculo_id] || {};
        return {
          ...a,
          artigo_nome: v.artigo_nome || null,
          cor_nome: v.cor_nome || null,
          linha_nome: v.linha_nome || null,
        };
      });

      return Response.json({ data });
    }

    if (action === 'delete_artigo') {
      // Buscar dados do artigo ANTES de deletar
      const { data: artigoData } = await supabase
        .from('produto_comercial_artigo')
        .select('produto_id, codigo_unico')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('produto_comercial_artigo')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) return Response.json({ error: error.message }, { status: 400 });

      // Remover SOMENTE o registro do produto específico na tabela_precos_sync
      // Não pode filtrar só por codigo_unico pois o mesmo artigo pode estar em outros produtos
      if (artigoData?.codigo_unico && artigoData?.produto_id) {
        await supabase
          .from('tabela_precos_sync')
          .update({ deleted_at: new Date().toISOString() })
          .eq('codigo_unico', artigoData.codigo_unico)
          .eq('produto_id', artigoData.produto_id)
          .eq('empresa_id', empresa_id);
        console.log('[delete_artigo] removido da tabela_precos_sync:', artigoData.codigo_unico, 'produto:', artigoData.produto_id);
      }

      // Sincronizar produto
      if (artigoData?.produto_id) {
        const { data: produtoData } = await supabase.from('produto_comercial').select('codigo').eq('id', artigoData.produto_id).single();
        if (produtoData?.codigo) {
          const syncRes = await base44.asServiceRole.functions.invoke('sincronizarTabelaPrecos', {
            empresa_id,
            codigo_produto: produtoData.codigo,
          });
          console.log('[delete_artigo] sincronizado:', syncRes.data?.success || false);
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'list_artigos_empresa') {
      const { data, error } = await supabase
        .from('produto_comercial_artigo')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null);

      if (error) return Response.json({ error: error.message }, { status: 400 });
      console.log('[list_artigos_empresa] sample:', data?.[0]);
      return Response.json({ data });
    }

    if (action === 'list_rendimentos') {
      const { data, error } = await supabase
        .from('produto_rendimentos')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data });
    }

    if (action === 'create_rendimento') {
      const { nome } = body;
      const { data, error } = await supabase
        .from('produto_rendimentos')
        .insert({ nome, empresa_id })
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data });
    }

    if (action === 'update_rendimento') {
      const { nome } = body;
      const { data, error } = await supabase
        .from('produto_rendimentos')
        .update({ nome })
        .eq('id', id)
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data });
    }

    if (action === 'delete_rendimento') {
      const { error } = await supabase
        .from('produto_rendimentos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ success: true });
    }

    if (action === 'list_rendimento_valores') {
      const { data, error } = await supabase
        .from('produto_rendimento_valores')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null);

      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data });
    }

    if (action === 'delete_rendimento_valores_linha') {
      const { produto_id, descricao_artigo } = body;
      const { error } = await supabase
        .from('produto_rendimento_valores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('empresa_id', empresa_id)
        .eq('produto_id', produto_id)
        .eq('descricao_artigo', descricao_artigo);

      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ success: true });
    }

    if (action === 'upsert_rendimento_valor') {
      const { rendimento_id, produto_id, descricao_artigo, vinculo_id, valor } = body;

      // Busca pelo constraint real do banco: (rendimento_id, produto_id, descricao_artigo)
      const { data: existing } = await supabase
        .from('produto_rendimento_valores')
        .select('id')
        .eq('empresa_id', empresa_id)
        .eq('produto_id', produto_id)
        .eq('rendimento_id', rendimento_id)
        .eq('descricao_artigo', descricao_artigo || '')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Atualiza pelo ID (inclui vinculo_id e restaura se estava deletado)
        const { data: updated, error: updateError } = await supabase
          .from('produto_rendimento_valores')
          .update({ valor, vinculo_id: vinculo_id || null, sincronizado: false, deleted_at: null, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (updateError) return Response.json({ error: updateError.message }, { status: 400 });
        return Response.json({ data: updated });
      }

      // Se não existe, insere novo
      const { data: inserted, error: insertError } = await supabase
        .from('produto_rendimento_valores')
        .insert({ empresa_id, rendimento_id, produto_id, vinculo_id: vinculo_id || null, descricao_artigo: descricao_artigo || '', valor, sincronizado: false })
        .select()
        .single();

      if (insertError) return Response.json({ error: insertError.message }, { status: 400 });
      return Response.json({ data: inserted });
    }

    if (action === 'init_produto_composicao') {
      return Response.json({ success: true });
    }

    if (action === 'list_produto_composicao') {
      const { produto_id } = body;
      const { data, error } = await supabase
        .from('produto_composicao')
        .select('*')
        .eq('produto_id', produto_id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data });
    }

    if (action === 'list_produto_composicao_empresa') {
      const { data, error } = await supabase
        .from('produto_composicao')
        .select('*')
        .eq('empresa_id', empresa_id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data });
    }

    if (action === 'save_produto_composicao') {
      const { produto_id, composicoes_por_variavel } = body;
      if (!produto_id || typeof produto_id !== 'string' || produto_id.trim() === '') {
        return Response.json({ error: 'produto_id inválido ou ausente' }, { status: 400 });
      }
      if (!empresa_id || typeof empresa_id !== 'string' || empresa_id.trim() === '') {
        return Response.json({ error: 'empresa_id inválido ou ausente' }, { status: 400 });
      }
      const { error: markDeleteError } = await supabase.from('produto_composicao').update({ deleted_at: new Date().toISOString() }).eq('produto_id', produto_id);
      if (markDeleteError) console.log('[save_produto_composicao] Soft delete error (non-fatal):', markDeleteError.message);

      if (composicoes_por_variavel && typeof composicoes_por_variavel === 'object') {
        const inserts = [];
        Object.entries(composicoes_por_variavel).forEach(([variavel, rendimentoIds]) => {
          if (Array.isArray(rendimentoIds) && rendimentoIds.length > 0) {
            rendimentoIds.forEach(rid => {
              inserts.push({
                empresa_id,
                produto_id,
                rendimento_id: String(rid),
                variavel_index: parseInt(variavel) || 1
              });
            });
          }
        });
        if (inserts.length > 0) {
          const insertsComRestore = inserts.map(r => ({ ...r, deleted_at: null }));
          const { error: insertError } = await supabase
            .from('produto_composicao')
            .upsert(insertsComRestore, { onConflict: 'produto_id,rendimento_id,variavel_index' });
          if (insertError) return Response.json({ error: insertError.message }, { status: 400 });
        }
      }
      return Response.json({ success: true });
    }

    if (action === 'save_produto_composicao_multi') {
      const { produto_id, composicoes } = body;
      if (!produto_id) return Response.json({ error: 'produto_id obrigatório' }, { status: 400 });
      if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

      // Buscar produto para obter o código
      const { data: produtoRow } = await supabase.from('produto_comercial').select('codigo, num_variaveis').eq('id', produto_id).single();
      const codigoProduto = produtoRow?.codigo;
      const numVariaveis = produtoRow?.num_variaveis || 1;

      // Nova rota: composicoes array enviado diretamente pelo frontend
      if (composicoes && Array.isArray(composicoes)) {
        // Validações
        if (composicoes.length > 4) return Response.json({ error: 'Máximo de 4 composições' }, { status: 400 });
        for (const c of composicoes) {
          if (!c.artigo_codigo && !c.codigo_unico) return Response.json({ error: `Composição ${c.indice}: artigo obrigatório` }, { status: 400 });
          if (!(parseFloat(c.consumo_un) > 0)) return Response.json({ error: `Composição ${c.indice}: consumo_un deve ser > 0` }, { status: 400 });
          if (!(parseFloat(c.custo_kg) > 0)) return Response.json({ error: `Composição ${c.indice}: custo_kg deve ser > 0` }, { status: 400 });
        }

        // SOFT DELETE: marcar registros anteriores como deletados
        await supabase.from('produto_composicao_multi').update({ deleted_at: new Date().toISOString() }).eq('produto_id', produto_id).eq('empresa_id', empresa_id);

        const inserts = composicoes.map(c => {
          const consumo_un = parseFloat(c.consumo_un) || 0;
          const custo_kg = parseFloat(c.custo_kg) || 0;
          return {
            produto_id,
            empresa_id,
            indice: c.indice,
            codigo_unico: c.codigo_unico || null,
            artigo_nome: c.artigo_nome || c.descricao_artigo || null,
            cor_nome: c.cor_nome || null,
            artigo_codigo: c.artigo_codigo || null,
            consumo_un,
            custo_kg,
            custo_un: consumo_un * custo_kg,
            updated_at: new Date().toISOString(),
          };
        });

        const { error: insertError } = await supabase.from('produto_composicao_multi').insert(inserts);
        if (insertError) return Response.json({ error: insertError.message }, { status: 400 });

        // Marca tipo_produto = 'composto' em tabela_precos_sync usando codigo_produto
        if (codigoProduto) {
          const updateResult = await supabase
            .from('tabela_precos_sync')
            .update({ tipo_produto: 'composto' })
            .eq('codigo_produto', codigoProduto)
            .eq('empresa_id', empresa_id);
          console.log('[save_produto_composicao_multi] marca composto:', codigoProduto, updateResult.error?.message || 'ok');
        }

        // Sincronizar produto em tabela_precos_sync
        const syncRes = await base44.asServiceRole.functions.invoke('sincronizarTabelaPrecos', {
          empresa_id,
          codigo_produto: codigoProduto,
        });
        console.log('[save_produto_composicao_multi] sincronizado:', syncRes.data?.success || false);

        const custo_total = inserts.reduce((acc, r) => acc + r.custo_un, 0);
        return Response.json({ success: true, cached: inserts.length, custo_total, sincronizado: syncRes.data?.success });
      }

      // Rota legada: lê artigos do produto e salva snapshot (sem consumo/custo)
      const { data: artigos, error: artigosError } = await supabase
        .from('produto_comercial_artigo')
        .select('*')
        .eq('produto_id', produto_id)
        .is('deleted_at', null);

      if (artigosError) return Response.json({ error: artigosError.message }, { status: 400 });
      await supabase.from('produto_composicao_multi').update({ deleted_at: new Date().toISOString() }).eq('produto_id', produto_id);

      if (!artigos || artigos.length === 0) return Response.json({ success: true, cached: 0 });

      const inserts = artigos.map(a => ({
        produto_id,
        empresa_id,
        indice: a.variavel_index ?? 1,
        codigo_unico: a.codigo_unico || null,
        artigo_codigo: a.artigo_codigo || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from('produto_composicao_multi').insert(inserts);
      if (insertError) return Response.json({ error: insertError.message }, { status: 400 });
      return Response.json({ success: true, cached: inserts.length });
    }

    if (action === 'list_rendimento_status') {
      // Busca composições e valores de uma vez, calcula status no servidor
      const [{ data: composicoes }, { data: valores }] = await Promise.all([
        supabase.from('produto_composicao').select('produto_id, rendimento_id').eq('empresa_id', empresa_id),
        supabase.from('produto_rendimento_valores').select('rendimento_id, produto_id, vinculo_id, valor, sincronizado').eq('empresa_id', empresa_id).is('deleted_at', null),
      ]);

      // Mapa de valores: `rendimento_id|produto_id|vinculo_id` → { valor, sincronizado }
      const valMap = {};
      console.log('[list_rendimento_status] valores count:', valores?.length || 0);
      if (valores && valores.length > 0) {
        console.log('[list_rendimento_status] sample valor:', JSON.stringify(valores[0], null, 2));
      }
      for (const v of (valores || [])) {
        // Usa vinculo_id como identificador (não descricao_artigo que foi removido)
        const vinculo_id = v.vinculo_id || '';
        valMap[`${v.rendimento_id}|${v.produto_id}|${vinculo_id}`] = v;
      }
      console.log('[list_rendimento_status] valMap size:', Object.keys(valMap).length);

      // Agrupa composições por produto_id
      const compPorProduto = {};
      for (const c of (composicoes || [])) {
        if (!compPorProduto[c.produto_id]) compPorProduto[c.produto_id] = [];
        compPorProduto[c.produto_id].push(c.rendimento_id);
      }

      // Coleta artigos por produto: buscar diretamente da tabela de artigos
      const { data: artigosData } = await supabase
        .from('produto_comercial_artigo')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null);

      // Mapa: (produto_id|artigo_nome) -> { vinculo_id }
      const artigosPorProduto = {};
      for (const a of (artigosData || [])) {
        if (!artigosPorProduto[a.produto_id]) artigosPorProduto[a.produto_id] = [];
        // Usa vinculo_id como identificador único do artigo
        if (a.vinculo_id && !artigosPorProduto[a.produto_id].includes(a.vinculo_id)) {
          artigosPorProduto[a.produto_id].push(a.vinculo_id);
        }
      }

      const statusMap = {};
      const statusPorProduto = {};

      console.log('[list_rendimento_status] artigosPorProduto:', Object.keys(artigosPorProduto).slice(0,5));

      const PRIORIDADE = { pendente: 0, sincronizar: 1, pronto: 2 };

      for (const [produto_id, rids] of Object.entries(compPorProduto)) {
        // Se não há artigos vinculados, usa '' como chave
        const vinculoIds = artigosPorProduto[produto_id] && artigosPorProduto[produto_id].length > 0
          ? artigosPorProduto[produto_id]
          : [''];

        let statusAgregado = 'pronto';

        for (const vinculo_id of vinculoIds) {
          const key = `${produto_id}|${vinculo_id}`;
          const todosComValor = rids.every(rid => {
            const chave = `${rid}|${produto_id}|${vinculo_id}`;
            const v = valMap[chave];
            return v && parseFloat(v.valor) > 0;
          });

          let statusArtigo;
          if (!todosComValor) {
            statusArtigo = 'pendente';
          } else {
            const todosSinc = rids.every(rid => {
              const v = valMap[`${rid}|${produto_id}|${vinculo_id}`];
              return v && v.sincronizado === true;
            });
            statusArtigo = todosSinc ? 'pronto' : 'sincronizar';
          }

          statusMap[key] = statusArtigo;

          if (PRIORIDADE[statusArtigo] < PRIORIDADE[statusAgregado]) {
            statusAgregado = statusArtigo;
          }
        }

        statusPorProduto[produto_id] = statusAgregado;
        }
        console.log('[list_rendimento_status] final statusMap keys:', Object.keys(statusMap).slice(0, 10));

        // Persiste status_rendimento em produto_comercial em paralelo (fire-and-forget tolerante a erro)
      const updates = Object.entries(statusPorProduto).map(([produto_id, status_rendimento]) =>
        supabase.from('produto_comercial').update({ status_rendimento }).eq('id', produto_id).eq('empresa_id', empresa_id)
      );
      await Promise.allSettled(updates);

      return Response.json({ data: statusMap });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});