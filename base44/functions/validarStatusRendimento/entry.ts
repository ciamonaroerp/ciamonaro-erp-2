import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { produto_id, empresa_id } = await req.json();
    if (!produto_id || !empresa_id) {
      return Response.json({ error: 'produto_id e empresa_id obrigatórios' }, { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };

    // 1. Busca artigos do produto (não deletados)
    const artRes = await fetch(
      `${SUPABASE_URL}/rest/v1/produto_comercial_artigo?produto_id=eq.${produto_id}&deleted_at=is.null&select=id,vinculo_id`,
      { headers }
    );
    const artigos = await artRes.json();
    if (!Array.isArray(artigos) || artigos.length === 0) {
      return Response.json({ status: 'nenhum_artigo' });
    }

    // 2. Busca composições do produto
    const compRes = await fetch(
      `${SUPABASE_URL}/rest/v1/produto_composicao?produto_id=eq.${produto_id}&select=rendimento_id,variavel_index`,
      { headers }
    );
    const composicoes = await compRes.json();
    if (!Array.isArray(composicoes) || composicoes.length === 0) {
      // Sem composições → todos os artigos pendentes
      const updates = artigos.map(a => ({
        id: a.id,
        status: 'pendente'
      }));
      for (const upd of updates) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/produto_comercial_artigo?id=eq.${upd.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status_rendimento: upd.status })
          }
        );
      }
      return Response.json({ resultado: updates });
    }

    // 3. Agrupa rendimentos por variável
    const grupoRend = {};
    composicoes.forEach(c => {
      const idx = c.variavel_index ?? 1;
      if (!grupoRend[idx]) grupoRend[idx] = [];
      grupoRend[idx].push(c.rendimento_id);
    });

    // 4. Busca valores salvos (somente não deletados)
    const valRes = await fetch(
      `${SUPABASE_URL}/rest/v1/produto_rendimento_valores?produto_id=eq.${produto_id}&deleted_at=is.null&select=rendimento_id,vinculo_id,valor`,
      { headers }
    );
    const valores = await valRes.json();

    // 5. Para cada artigo, determina o status
    const resultado = [];
    for (const artigo of artigos) {
      const vid = artigo.vinculo_id || '';
      
      // Filtra valores específicos deste artigo
      const valoresDoArtigo = valores.filter(v => (v.vinculo_id || '') === vid);
      
      // Verifica se pelo menos uma variável tem todos os rendimentos > 0
      const variaveis = Object.keys(grupoRend).map(v => parseInt(v));
      const algumVariavelCompleta = variaveis.some(idx => {
        const rids = grupoRend[idx];
        return rids.length > 0 && rids.every(rid => {
          const v = valoresDoArtigo.find(val => val.rendimento_id === rid);
          return v && parseFloat(v.valor) > 0;
        });
      });

      const status = algumVariavelCompleta ? 'pronto' : 'pendente';
      
      // Salva o status
      await fetch(
        `${SUPABASE_URL}/rest/v1/produto_comercial_artigo?id=eq.${artigo.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status_rendimento: status })
        }
      );
      
      resultado.push({ artigo_id: artigo.id, vinculo_id: vid, status });
    }

    return Response.json({ resultado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});