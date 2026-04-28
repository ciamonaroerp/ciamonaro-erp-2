import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    const { empresa_id, artigo_id, cor_id, linha_comercial_id, codigo_unico: codigoUnicoParam, descricao_base, descricao_complementar, codigo_pedido, fornecedor_id } = body;

    if (!empresa_id || !artigo_id || !cor_id || !linha_comercial_id) {
      return Response.json(
        { error: 'Missing required fields: empresa_id, artigo_id, cor_id, linha_comercial_id' },
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Busca nomes dos registros pelos IDs
    const [{ data: artigo }, { data: cor }, { data: linha }] = await Promise.all([
      supabase.from('config_tecido_artigo').select('nome_artigo').eq('id', artigo_id).single(),
      supabase.from('config_tecido_cor').select('nome_cor').eq('id', cor_id).single(),
      supabase.from('config_tecido_linha_comercial').select('nome_linha_comercial').eq('id', linha_comercial_id).single(),
    ]);

    if (!artigo || !cor || !linha) {
      return Response.json({ error: 'Artigo, cor ou linha comercial não encontrado' }, { status: 404 });
    }

    const codigoUnico = codigoUnicoParam || crypto.randomUUID();

    // Tenta primeiro na tabela config_vinculos, depois em configvinculos como fallback
    let vinculo, erroVinculo;

    const insertData = {
      empresa_id,
      codigo_unico: codigoUnico,
      artigo_nome_comercial: artigo.nome_artigo,
      cor_nome_comercial: cor.nome_cor,
      linha_comercial_nome: linha.nome_linha_comercial,
      descricao_base: descricao_base || null,
      descricao_complementar: descricao_complementar || null,
      codigo_pedido: codigo_pedido || null,
      fornecedor_id: fornecedor_id || null,
    };

    // Tenta config_vinculos primeiro
    const res1 = await supabase.from('config_vinculos').insert([insertData]).select().single();
    if (res1.error) {
      console.log('[criarVinculoComercial] config_vinculos falhou, tentando configvinculos:', res1.error.message);
      // Tenta configvinculos (sem underscore)
      const res2 = await supabase.from('configvinculos').insert([insertData]).select().single();
      vinculo = res2.data;
      erroVinculo = res2.error;
    } else {
      vinculo = res1.data;
      erroVinculo = null;
    }

    if (erroVinculo) {
      console.error('[criarVinculoComercial] Erro ao inserir vínculo:', erroVinculo);
      return Response.json({ error: `Failed to create vinculo: ${erroVinculo.message}` }, { status: 500 });
    }

    console.log('[criarVinculoComercial] Vínculo criado:', vinculo);

    return Response.json({
      success: true,
      message: 'Vínculo comercial criado com sucesso',
      data: vinculo
    });

  } catch (error) {
    console.error('[criarVinculoComercial] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});