import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Clona o request ANTES do SDK consumir o body
    const reqClone = req.clone();
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lê o body do clone
    const body = await reqClone.json();
    const { empresa_id, artigos, produto_id: produto_id_global } = body;

    if (!empresa_id || !artigos || !Array.isArray(artigos)) {
      return Response.json({ error: 'Missing empresa_id or artigos', body_received: body }, { status: 400 });
    }

    // RLS desabilitada na tabela_precos_sync — usa anon key direto sem token de usuário
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('VITE_SUPABASE_ANON_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let updated = 0;
    let inserted = 0;
    const erros = [];

    for (const artigo of artigos) {
      const { codigo_unico, consumo_un, custo_kg, indice, produto_id: produto_id_item, codigo_produto, nome_produto } = artigo;
      const produto_id = produto_id_item || produto_id_global || null;

      if (!codigo_unico || !produto_id) continue;

      const consumoVal = parseFloat(String(consumo_un ?? '').replace(',', '.')) || 0;
      const custoVal = parseFloat(String(custo_kg ?? '').replace(',', '.')) || 0;
      const custoUn = consumoVal * custoVal;
      const indiceVal = parseInt(indice) || 1;

      // 1. Verifica se já existe o registro
      const { data: existente, error: selectError } = await supabase
        .from('tabela_precos_sync')
        .select('id')
        .eq('codigo_unico', codigo_unico)
        .eq('produto_id', produto_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle();

      if (selectError) {
        erros.push({ codigo_unico, op: 'SELECT', erro: selectError.message });
        continue;
      }

      if (existente) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('tabela_precos_sync')
          .update({ consumo_un: consumoVal, custo_kg: custoVal, custo_un: custoUn, indice: indiceVal })
          .eq('id', existente.id);

        if (updateError) {
          erros.push({ codigo_unico, op: 'UPDATE', erro: updateError.message });
        } else {
          updated++;
        }
      } else {
        // INSERT — inclui campos NOT NULL obrigatórios da tabela
        const { error: insertError } = await supabase
          .from('tabela_precos_sync')
          .insert({
            codigo_unico,
            produto_id,
            empresa_id,
            codigo_produto: codigo_produto || '',
            nome_produto: nome_produto || '',
            consumo_un: consumoVal,
            custo_kg: custoVal,
            custo_un: custoUn,
            indice: indiceVal,
          });

        if (insertError) {
          erros.push({ codigo_unico, op: 'INSERT', erro: insertError.message });
        } else {
          inserted++;
        }
      }
    }

    return Response.json({
      success: true,
      updated,
      inserted,
      total: artigos.length,
      erros,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});