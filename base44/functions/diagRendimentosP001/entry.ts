import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
  const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/produto_comercial?codigo=eq.P001&select=id,codigo,empresa_id`, { headers });
  const produtos = await pRes.json();
  if (!produtos.length) return Response.json({ error: 'P001 não encontrado' });
  const produto = produtos[0];

  // Artigos ATIVOS (sem deleted_at)
  const aRes = await fetch(`${SUPABASE_URL}/rest/v1/produto_comercial_artigo?produto_id=eq.${produto.id}&deleted_at=is.null&select=vinculo_id`, { headers });
  const artigos = await aRes.json();
  const vinculoIds = [...new Set(artigos.map(a => a.vinculo_id).filter(Boolean))];

  // Composições
  const cRes = await fetch(`${SUPABASE_URL}/rest/v1/produto_composicao?produto_id=eq.${produto.id}&select=rendimento_id,variavel_index`, { headers });
  const composicoes = await cRes.json();
  const ridsComposicao = [...new Set(composicoes.map(c => c.rendimento_id))];

  // Rendimentos
  const rRes = await fetch(`${SUPABASE_URL}/rest/v1/produto_rendimentos?empresa_id=eq.${produto.empresa_id}&deleted_at=is.null&select=id,nome`, { headers });
  const rendimentos = await rRes.json();
  const rendMap = {};
  rendimentos.forEach(r => { rendMap[r.id] = r.nome; });

  // Valores do produto (todos, sem filtro deleted_at)
  const vRes = await fetch(`${SUPABASE_URL}/rest/v1/produto_rendimento_valores?produto_id=eq.${produto.id}&select=rendimento_id,vinculo_id,valor,deleted_at`, { headers });
  const valores = await vRes.json();

  // config_vinculos para artigos ativos
  let vinculosMap = {};
  if (vinculoIds.length > 0) {
    const vinRes = await fetch(`${SUPABASE_URL}/rest/v1/config_vinculos?id=in.(${vinculoIds.join(',')})&select=id,artigo_nome`, { headers });
    const vins = await vinRes.json();
    vins.forEach(v => { vinculosMap[v.id] = v.artigo_nome; });
  }

  // Para cada artigo ativo, simula o getStatus
  const resultado = vinculoIds.map(vid => {
    const valoresDoItem = valores.filter(v => (v.vinculo_id || '') === vid && !v.deleted_at);
    const temRegistroComVinculo = valoresDoItem.length > 0;

    const detalhes = ridsComposicao.map(rid => {
      let valor = null;
      let fonte = null;
      if (temRegistroComVinculo) {
        const v = valoresDoItem.find(val => val.rendimento_id === rid);
        valor = v?.valor ?? null;
        fonte = 'vinculo_exato';
      } else {
        const v = valores.find(val => val.rendimento_id === rid && !val.vinculo_id && !val.deleted_at);
        valor = v?.valor ?? null;
        fonte = 'legado_null';
      }
      return {
        rendimento_id: rid,
        rendimento_nome: rendMap[rid] || rid,
        valor,
        fonte,
        pendente: valor == null || parseFloat(valor) === 0,
      };
    });

    const status = detalhes.every(d => !d.pendente) ? 'pronto' : 'pendente';
    return {
      vinculo_id: vid,
      artigo_nome: vinculosMap[vid] || vid,
      temRegistroComVinculo,
      status,
      detalhes,
    };
  });

  return Response.json({ produto_id: produto.id, vinculoIds_ativos: vinculoIds, resultado });
});