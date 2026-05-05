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

    // 1. Busca composições do produto
    const compRes = await fetch(
      `${SUPABASE_URL}/rest/v1/produto_composicao?produto_id=eq.${produto_id}&select=rendimento_id,variavel_index`,
      { headers }
    );
    const composicoes = await compRes.json();
    if (!Array.isArray(composicoes) || composicoes.length === 0) {
      // Sem composições → status "pendente"
      await fetch(
        `${SUPABASE_URL}/rest/v1/produto_comercial?id=eq.${produto_id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status_rendimento: 'pendente' })
        }
      );
      return Response.json({ status: 'pendente', reason: 'sem_composicoes' });
    }

    // 2. Agrupa rendimentos por variável
    const grupoRend = {};
    composicoes.forEach(c => {
      const idx = c.variavel_index ?? 1;
      if (!grupoRend[idx]) grupoRend[idx] = [];
      grupoRend[idx].push(c.rendimento_id);
    });

    // 3. Busca valores salvos (somente registros não deletados)
    const valRes = await fetch(
      `${SUPABASE_URL}/rest/v1/produto_rendimento_valores?produto_id=eq.${produto_id}&deleted_at=is.null&select=rendimento_id,valor`,
      { headers }
    );
    const valores = await valRes.json();
    const valorMap = {};
    valores.forEach(v => {
      valorMap[v.rendimento_id] = parseFloat(v.valor) || 0;
    });

    // 4. Verifica se pelo menos uma variável tem todos os rendimentos com valor > 0
    const variaveis = Object.keys(grupoRend).map(v => parseInt(v));
    const algumVariavelCompleta = variaveis.some(idx => {
      const rids = grupoRend[idx];
      return rids.length > 0 && rids.every(rid => {
        const val = valorMap[rid] ?? 0;
        return val > 0;
      });
    });

    const novoStatus = algumVariavelCompleta ? 'pronto' : 'pendente';

    // 5. Salva o status na tabela produto_comercial
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/produto_comercial?id=eq.${produto_id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status_rendimento: novoStatus })
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return Response.json({ error: 'Erro ao salvar status', details: err }, { status: 500 });
    }

    return Response.json({ status: novoStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});