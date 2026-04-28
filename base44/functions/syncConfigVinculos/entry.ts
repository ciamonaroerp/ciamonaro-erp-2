import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Suporta formato de automação Base44
    const { event, data: recordData } = body;
    
    if (!event || event.entity_name !== 'ConfigTecidoVinculos') {
      return Response.json({ success: true, message: 'Not a ConfigTecidoVinculos event' });
    }

    const { id: vinculo_id, empresa_id, artigo_id, cor_tecido_id, linha_comercial_id, codigo_unico } = recordData;

    console.log('[syncConfigVinculos] Processing:', { vinculo_id, empresa_id, artigo_id, cor_tecido_id, linha_comercial_id, codigo_unico });

    if (!codigo_unico || !empresa_id) {
      return Response.json({ error: 'Missing required fields: codigo_unico, empresa_id' }, { status: 400 });
    }

    // Busca os nomes comerciais das tabelas mestre em paralelo
    const [artigoResult, corResult, linhaResult] = await Promise.all([
      supabase.from('config_tecido_artigo').select('nome_artigo').eq('id', artigo_id).eq('empresa_id', empresa_id).maybeSingle(),
      supabase.from('config_tecido_cor').select('nome_cor').eq('id', cor_tecido_id).eq('empresa_id', empresa_id).maybeSingle(),
      supabase.from('config_tecido_linha_comercial').select('nome_linha_comercial').eq('id', linha_comercial_id).eq('empresa_id', empresa_id).maybeSingle()
    ]);

    const artigo = artigoResult.data;
    const cor = corResult.data;
    const linha = linhaResult.data;

    console.log('[syncConfigVinculos] Master data:', { artigo, cor, linha });

    if (!artigo || !cor || !linha) {
      console.error('[syncConfigVinculos] Missing master data:', { artigo, cor, linha });
      return Response.json({ error: 'Invalid references: missing artigo, cor, or linha' }, { status: 400 });
    }

    // Prepara dados para ConfigVinculos
    const configVinculoData = {
      empresa_id,
      codigo_unico,
      artigo_nome: artigo.nome_artigo,
      cor_nome: cor.nome_cor,
      linha_nome: linha.nome_linha_comercial
    };

    console.log('[syncConfigVinculos] Prepared data:', configVinculoData);

    // Verifica se já existe um registro com este codigo_unico
    const { data: existentes } = await supabase
      .from('config_vinculos')
      .select('id')
      .eq('codigo_unico', codigo_unico)
      .eq('empresa_id', empresa_id);

    let resultado;
    if (existentes && existentes.length > 0) {
      // Atualiza registro existente
      const id = existentes[0].id;
      console.log('[syncConfigVinculos] Updating record:', id);
      const { data: updateData, error: updateError } = await supabase
        .from('config_vinculos')
        .update(configVinculoData)
        .eq('id', id)
        .select();
      
      if (updateError) {
        console.error('[syncConfigVinculos] Update error:', updateError);
        return Response.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
      }
      resultado = updateData[0];
    } else {
      // Cria novo registro
      console.log('[syncConfigVinculos] Creating new record');
      const { data: insertData, error: insertError } = await supabase
        .from('config_vinculos')
        .insert([configVinculoData])
        .select();
      
      if (insertError) {
        console.error('[syncConfigVinculos] Insert error:', insertError);
        return Response.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 });
      }
      resultado = insertData[0];
    }

    console.log('[syncConfigVinculos] Successfully saved:', resultado);

    return Response.json({ 
      success: true, 
      message: 'ConfigVinculos synced successfully',
      data: resultado 
    });

  } catch (error) {
    console.error('[syncConfigVinculos] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});