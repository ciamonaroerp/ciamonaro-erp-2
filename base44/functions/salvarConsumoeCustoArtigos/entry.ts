import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { empresa_id, artigos, produto_id: produto_id_global } = await req.json();

    if (!empresa_id || !artigos || !Array.isArray(artigos)) {
      return Response.json({ error: 'Missing empresa_id or artigos' }, { status: 400 });
    }

    // Usa o token do usuário autenticado para respeitar RLS
    const authHeader = req.headers.get('Authorization') || '';
    const userToken = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('VITE_SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: `Bearer ${userToken}` } }, auth: { autoRefreshToken: false, persistSession: false } }
    );
    let updated = 0;

    for (const artigo of artigos) {
      const { codigo_unico, consumo_un, custo_kg, indice, produto_id: produto_id_item } = artigo;

      // produto_id pode vir por item ou global
      const produto_id = produto_id_item || produto_id_global || null;

      if (!codigo_unico || consumo_un === null || custo_kg === null) {
        continue;
      }

      const consumoVal = parseFloat(consumo_un) || 0;
      const custoVal = parseFloat(custo_kg) || 0;
      const custoUn = consumoVal * custoVal;
      const indiceVal = parseInt(indice) || 1;

      // CRÍTICO: sempre filtrar por produto_id para não afetar outros produtos com mesmo codigo_unico
      if (!produto_id) {
        console.warn(`[salvarConsumoeCustoArtigos] SKIP: codigo_unico=${codigo_unico} sem produto_id — filtro inseguro`);
        continue;
      }

      console.log(`[salvarConsumoeCustoArtigos] UPDATE: codigo_unico=${codigo_unico}, produto_id=${produto_id}, empresa_id=${empresa_id}`);

      const { error } = await supabase
        .from('tabela_precos_sync')
        .upsert({
          codigo_unico,
          produto_id,
          empresa_id,
          consumo_un: consumoVal,
          custo_kg: custoVal,
          custo_un: custoUn,
          indice: indiceVal,
        }, { onConflict: 'codigo_unico,produto_id,empresa_id', ignoreDuplicates: false });

      if (error) {
        console.error(`[salvarConsumoeCustoArtigos] Erro: ${error.message}`);
      } else {
        updated++;
      }
    }

    return Response.json({
      success: true,
      updated,
      total: artigos.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});