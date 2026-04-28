import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { produto_id, empresa_id, composicoes_por_variavel, artigos_por_indice } = await req.json();

    if (!produto_id || !empresa_id) {
      return Response.json({ error: 'produto_id e empresa_id são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Busca nomes das composições pelo ID
    const todosComposicoes = await base44.functions.invoke('produtoComercialCRUD', {
      action: 'list_rendimentos',
      empresa_id,
    });
    const composicoes = todosComposicoes?.data?.data || [];
    const composicaoMap = {};
    composicoes.forEach(c => {
      composicaoMap[String(c.id)] = c.nome || '';
    });

    // Para cada índice, gera resumo baseado nas composições selecionadas
    const resumoPorIndice = {};
    Object.keys(composicoes_por_variavel).forEach(indice => {
      const ids = composicoes_por_variavel[indice] || [];
      const nomes = ids.map(id => composicaoMap[id]).filter(Boolean);
      resumoPorIndice[indice] = nomes.length > 0 
        ? `Composição ${indice} (${nomes.join(', ')})`
        : '';
    });

    console.log('[salvarResumoComposicoes] resumoPorIndice:', resumoPorIndice);
    console.log('[salvarResumoComposicoes] artigos_por_indice:', artigos_por_indice);

    // Atualiza tabela_precos_sync para cada artigo, baseado no seu indice
    for (const [indice, artigosList] of Object.entries(artigos_por_indice)) {
      const resumo = resumoPorIndice[indice] || '';
      for (const artigo of artigosList) {
        console.log(`[salvarResumoComposicoes] Atualizando ${artigo.codigo_unico} com resumo: "${resumo}"`);
        const { data, error } = await supabase
          .from('tabela_precos_sync')
          .update({ resumo_composicoes: resumo })
          .eq('codigo_unico', artigo.codigo_unico)
          .eq('produto_id', produto_id);
        
        if (error) {
          console.error(`[salvarResumoComposicoes] Erro ao atualizar ${artigo.codigo_unico}:`, error.message);
        } else {
          console.log(`[salvarResumoComposicoes] ✓ ${artigo.codigo_unico} atualizado`);
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[salvarResumoComposicoes] Erro:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});