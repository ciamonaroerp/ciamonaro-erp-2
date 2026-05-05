import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { produto_id, empresa_id } = body;

    if (!produto_id || !empresa_id) {
      return Response.json({ error: 'produto_id e empresa_id obrigatórios' }, { status: 400 });
    }

    // Cria cliente Supabase com service role key
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const { data: precosSync, error: errorPrecos } = await supabase
      .from('tabela_precos_sync')
      .select('id, codigo_unico, artigo_nome, cor_nome, linha_nome, consumo_un, custo_kg, custo_un, produto_id')
      .eq('produto_id', produto_id)
      .eq('empresa_id', empresa_id);

    const { data: artigos, error: errorArtigos } = await supabase
      .from('produto_comercial_artigo')
      .select('id, codigo_unico, artigo_nome, status_rendimento, variavel_index, produto_id')
      .eq('produto_id', produto_id);

    const { data: produto, error: errorProduto } = await supabase
      .from('produto_comercial')
      .select('id, nome_produto, numero_variaveis, variáveis, num_variaveis')
      .eq('id', produto_id)
      .single();

    return Response.json({
      produto: produto,
      total_artigos: artigos?.length || 0,
      artigos: artigos,
      total_precos_sync: precosSync?.length || 0,
      precos_sync: precosSync,
      erros: {
        errorProduto,
        errorArtigos,
        errorPrecos
      },
      diagnostico: {
        'Produto existe': !!produto,
        'Número de variáveis': produto?.num_variaveis || produto?.variáveis || 0,
        'Artigos vinculados': artigos?.length || 0,
        'Registros em tabela_precos_sync': precosSync?.length || 0,
        'Problema': precosSync?.length === 0 ? 'Nenhum registro em tabela_precos_sync - pode estar vazio ou não sincronizado' : 'Dados existem'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});