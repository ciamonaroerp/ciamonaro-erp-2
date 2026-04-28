import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY'),
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, codigo_unico, empresa_id, preco, data_nf, fornecedor_nome, numero_nf } = body;

    // ATUALIZAR CACHE INTELIGENTE
    if (action === 'atualizar') {
      if (!codigo_unico || !empresa_id || !preco) {
        return Response.json({ sucesso: false, erro: 'codigo_unico, empresa_id e preco sao obrigatorios' });
      }

      const precoNovo = Number(preco);

      // Busca os ultimos 5 registros do historico
      const { data: historico } = await supabase
        .from('historico_precos_produto_erp')
        .select('valor_unitario, data_emissao')
        .eq('codigo_unico', codigo_unico)
        .eq('empresa_id', empresa_id)
        .order('data_emissao', { ascending: false })
        .limit(5);

      const precos = (historico || []).map(h => Number(h.valor_unitario)).filter(v => v > 0);

      let media_preco = precoNovo;
      let preco_min = precoNovo;
      let preco_max = precoNovo;
      let preco_sugerido = precoNovo;
      let quantidade_amostras = 1;

      if (precos.length > 0) {
        const soma = precos.reduce((acc, v) => acc + v, 0);
        media_preco = soma / precos.length;
        preco_min = Math.min(...precos);
        preco_max = Math.max(...precos);
        quantidade_amostras = precos.length;

        // Se variacao > 20% da media, usa media como sugerido
        const variacao = Math.abs(precoNovo - media_preco) / media_preco;
        preco_sugerido = variacao > 0.2 ? media_preco : precoNovo;
      }

      const agora = new Date().toISOString();

      const { data: existente } = await supabase
        .from('ultimo_preco_produto')
        .select('id, data_ultima_nf')
        .eq('codigo_unico', codigo_unico)
        .eq('empresa_id', empresa_id)
        .single();

      const payload = {
        codigo_unico,
        empresa_id,
        ultimo_preco: precoNovo,
        media_preco,
        preco_min,
        preco_max,
        preco_sugerido,
        quantidade_amostras,
        data_ultima_nf: data_nf || agora,
        fornecedor_nome: fornecedor_nome || null,
        numero_nf: numero_nf || null,
        updated_at: agora
      };

      if (!existente) {
        await supabase.from('ultimo_preco_produto').insert(payload);
        return Response.json({ sucesso: true, acao: 'criado', preco_sugerido, media_preco });
      }

      const dataExistente = existente.data_ultima_nf ? new Date(existente.data_ultima_nf) : new Date(0);
      const dataNova = data_nf ? new Date(data_nf) : new Date();

      if (dataNova > dataExistente) {
        await supabase.from('ultimo_preco_produto').update(payload).eq('id', existente.id);
        return Response.json({ sucesso: true, acao: 'atualizado', preco_sugerido, media_preco });
      }

      return Response.json({ sucesso: true, acao: 'ignorado_data_antiga' });
    }

    // GET: Buscar preco inteligente por codigo_unico
    if (action === 'get') {
      if (!codigo_unico || !empresa_id) {
        return Response.json({ erro: 'codigo_unico e empresa_id sao obrigatorios' });
      }

      // Tenta buscar do cache primeiro
      const { data } = await supabase
        .from('ultimo_preco_produto')
        .select('ultimo_preco, preco_sugerido, media_preco, preco_min, preco_max, quantidade_amostras, data_ultima_nf, fornecedor_nome, numero_nf')
        .eq('codigo_unico', codigo_unico)
        .eq('empresa_id', empresa_id)
        .single();

      // Se nao tem cache, calcula direto do historico
      if (!data) {
        const { data: historico } = await supabase
          .from('historico_precos_produto_erp')
          .select('valor_unitario, data_emissao, fornecedor_nome, numero_nf')
          .eq('codigo_unico', codigo_unico)
          .eq('empresa_id', empresa_id)
          .gt('valor_unitario', 0)
          .order('data_emissao', { ascending: false })
          .limit(5);

        if (!historico || historico.length === 0) {
          return Response.json({ erro: 'Sem preco disponivel' });
        }

        const precos = historico.map(h => Number(h.valor_unitario));
        const ultimo = precos[0];
        const media = precos.reduce((a, v) => a + v, 0) / precos.length;
        const min = Math.min(...precos);
        const max = Math.max(...precos);
        const variacao = Math.abs(ultimo - media) / media;
        const sugerido = variacao > 0.2 ? media : ultimo;
        const alerta = variacao > 0.2;

        // Persiste no cache para proximas consultas
        await supabase.from('ultimo_preco_produto').upsert({
          codigo_unico,
          empresa_id,
          ultimo_preco: ultimo,
          media_preco: media,
          preco_min: min,
          preco_max: max,
          preco_sugerido: sugerido,
          quantidade_amostras: precos.length,
          data_ultima_nf: historico[0].data_emissao,
          fornecedor_nome: historico[0].fornecedor_nome,
          numero_nf: historico[0].numero_nf,
          updated_at: new Date().toISOString()
        }, { onConflict: 'codigo_unico,empresa_id' });

        return Response.json({
          preco: sugerido,
          ultimo,
          media,
          min,
          max,
          quantidade_amostras: precos.length,
          alerta,
          data: historico[0].data_emissao,
          fornecedor_nome: historico[0].fornecedor_nome,
          numero_nf: historico[0].numero_nf
        });
      }

      const ultimo = Number(data.ultimo_preco);
      const media = Number(data.media_preco || ultimo);
      const sugerido = Number(data.preco_sugerido || ultimo);
      const alerta = media > 0 && Math.abs(ultimo - media) / media > 0.2;

      return Response.json({
        preco: sugerido,
        ultimo,
        media,
        min: Number(data.preco_min || ultimo),
        max: Number(data.preco_max || ultimo),
        quantidade_amostras: data.quantidade_amostras || 1,
        alerta,
        data: data.data_ultima_nf,
        fornecedor_nome: data.fornecedor_nome,
        numero_nf: data.numero_nf
      });
    }

    // GET_TODOS: Buscar todos os caches de uma empresa
    if (action === 'get_todos') {
      if (!empresa_id) {
        return Response.json({ data: {} });
      }

      const { data } = await supabase
        .from('ultimo_preco_produto')
        .select('codigo_unico, ultimo_preco, preco_sugerido, media_preco, preco_min, preco_max, quantidade_amostras, data_ultima_nf, fornecedor_nome, numero_nf')
        .eq('empresa_id', empresa_id);

      const mapa = {};
      for (const row of (data || [])) {
        const ultimo = Number(row.ultimo_preco);
        const media = Number(row.media_preco || ultimo);
        const sugerido = Number(row.preco_sugerido || ultimo);
        const alerta = media > 0 && Math.abs(ultimo - media) / media > 0.2;
        mapa[row.codigo_unico] = {
          preco: sugerido,
          ultimo,
          media,
          min: Number(row.preco_min || ultimo),
          max: Number(row.preco_max || ultimo),
          quantidade_amostras: row.quantidade_amostras || 1,
          alerta,
          data: row.data_ultima_nf,
          fornecedor_nome: row.fornecedor_nome,
          numero_nf: row.numero_nf
        };
      }

      return Response.json({ data: mapa });
    }

    return Response.json({ erro: 'action invalida' }, { status: 400 });

  } catch (err) {
    console.error('[ultimoPrecoCache] ERRO:', err.message);
    return Response.json({ erro: err.message }, { status: 500 });
  }
});