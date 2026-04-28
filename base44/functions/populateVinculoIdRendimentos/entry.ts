import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { empresa_id } = body;
    if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // 1. Busca todos os artigos com seus vinculo_id
    const { data: artigos } = await supabase
      .from('produto_comercial_artigo')
      .select('id, vinculo_id, config_vinculo_id, produto_id, artigo_codigo')
      .eq('empresa_id', empresa_id)
      .is('deleted_at', null);

    console.log('[populateVinculoIdRendimentos] artigos carregados:', (artigos || []).length);

    // 2. Monta mapa por artigo_codigo (é o identificador no rendimento_valores)
    const vinculoMapPorCodigo = {};
    const vinculoMapPorProduto = {};
    
    (artigos || []).forEach(a => {
      const vid = a.vinculo_id || a.config_vinculo_id;
      if (vid && a.artigo_codigo) {
        vinculoMapPorCodigo[a.artigo_codigo] = vid;
      }
      if (vid) {
        vinculoMapPorProduto[a.produto_id] = vid;
      }
    });

    console.log('[populateVinculoIdRendimentos] vinculoMapPorCodigo size:', Object.keys(vinculoMapPorCodigo).length);
    console.log('[populateVinculoIdRendimentos] vinculoMapPorProduto size:', Object.keys(vinculoMapPorProduto).length);

    // 3. Busca todos os rendimento_valores COM descricao_artigo
    const { data: valores } = await supabase
      .from('produto_rendimento_valores')
      .select('id, produto_id, descricao_artigo, vinculo_id')
      .eq('empresa_id', empresa_id)
      .is('deleted_at', null)
      .not('descricao_artigo', 'is', null);

    console.log('[populateVinculoIdRendimentos] valores to process:', (valores || []).length);

    // 4. Atualiza cada valor com vinculo_id correto (tenta por descricao_artigo, depois por produto_id)
    let atualizados = 0;
    for (const val of (valores || [])) {
      if (!val.descricao_artigo) continue;

      // Tenta extrair codigo de artigo da descricao_artigo (ex: "A004C5255L002 | ...")
      const partes = val.descricao_artigo.split('|');
      const artigoCode = partes[0]?.trim() || '';

      // Procura primeiro por codigo de artigo, depois por produto_id
      let vinculoId = vinculoMapPorCodigo[artigoCode] || vinculoMapPorProduto[val.produto_id];

      if (vinculoId && val.vinculo_id !== vinculoId) {
        const { error: updateErr } = await supabase
          .from('produto_rendimento_valores')
          .update({ vinculo_id: vinculoId, updated_at: new Date().toISOString() })
          .eq('id', val.id);
        
        if (updateErr) {
          console.error('[populateVinculoIdRendimentos] Update error:', updateErr.message);
        } else {
          atualizados++;
          console.log(`[populateVinculoIdRendimentos] ✓ Updated ${val.id} with vinculo_id=${vinculoId}`);
        }
      }
    }

    console.log('[populateVinculoIdRendimentos] Total atualizados:', atualizados);

    return Response.json({ 
      success: true, 
      atualizados,
      vinculoMapSize: Object.keys(vinculoMapPorCodigo).length,
      valoresProcessados: (valores || []).length
    });
  } catch (error) {
    console.error('[populateVinculoIdRendimentos] Exception:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});