import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY'),
  { auth: { persistSession: false } }
);

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularScore(descNF, descProduto, corNomeComercial) {
  const nfNorm = normalize(descNF);
  const nfTokens = nfNorm.split(' ').filter(Boolean);
  const prodTokens = normalize(descProduto).split(' ').filter(Boolean);
  if (nfTokens.length === 0) return 0;

  let hits = 0;
  for (const t of nfTokens) {
    if (prodTokens.includes(t)) hits++;
  }
  let score = hits / nfTokens.length;

  // Se a cor está cadastrada, VERIFICAR se aparece na NF
  // Se a cor NÃO aparecer na descrição da NF → produto errado, score cai para 0
  if (corNomeComercial) {
    const corNorm = normalize(corNomeComercial);
    const corTokens = corNorm.split(' ').filter(t => t.length > 2); // ignora tokens curtos
    if (corTokens.length > 0) {
      const corNaDesc = corTokens.some(t => nfNorm.includes(t));
      if (corNaDesc) {
        score += 1.5; // bonus: cor correta encontrada
      } else {
        score = 0; // penalidade total: cor errada, não vincular
      }
    }
  }

  return score;
}

Deno.serve(async (req) => {
  try {
    // Clona o request para SDK poder ler headers enquanto consumimos o body
    const reqForSdk = req.clone();
    const body = await req.json();
    const base44 = createClientFromRequest(reqForSdk);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { empresa_id, fornecedor_id, itens } = body;
    console.log('[vincular] empresa_id:', empresa_id, '| fornecedor_id:', fornecedor_id, '| itens:', itens?.length);

    if (!empresa_id || !fornecedor_id || !Array.isArray(itens)) {
      return Response.json({ error: 'empresa_id, fornecedor_id e itens são obrigatórios' }, { status: 400 });
    }

    const normCNPJ = (s) => (s || '').replace(/\D/g, '');
    const fornNorm = normCNPJ(fornecedor_id);

    const logs = [];

    // Carregar histórico de aprendizado (tabela pode não existir ainda)
    let mapaHistorico = {};
    try {
      const { data: historico } = await supabase
        .from('vinculo_produto_nf')
        .select('descricao_normalizada, codigo_unico, score, origem')
        .eq('empresa_id', empresa_id)
        .eq('fornecedor_id', fornNorm);

      for (const h of (historico || [])) {
        if (h.descricao_normalizada && !mapaHistorico[h.descricao_normalizada]) {
          mapaHistorico[h.descricao_normalizada] = h;
        }
      }
      logs.push(`Histórico carregado: ${Object.keys(mapaHistorico).length} entrada(s)`);
    } catch (e) {
      logs.push(`Aviso: tabela vinculo_produto_nf ainda não existe. Criando aprendizado do zero.`);
    }

    // Carregar produtos (config_vinculos)
    const { data: produtos } = await supabase
      .from('config_vinculos')
      .select('codigo_unico, descricao_base, descricao_complementar, descricao_unificada, artigo_nome_comercial, cor_nome_comercial, fornecedor_id')
      .eq('empresa_id', empresa_id)
      .is('deleted_at', null);

    const produtosForn = (produtos || []).filter(p =>
      !p.fornecedor_id || normCNPJ(p.fornecedor_id) === fornNorm
    );

    logs.push(`Produtos disponíveis para vínculo: ${produtosForn.length}`);

    const aprendizados = [];
    const itensEnriquecidos = [];

    for (const item of itens) {
      const descRaw = [item.descricao_complementar, item.descricao_base].filter(Boolean).join(' ');
      const descNorm = normalize(descRaw);

      // 1. Buscar no histórico
      const hist = mapaHistorico[descNorm];
      if (hist && hist.codigo_unico) {
        logs.push(`✓ HISTÓRICO — "${descRaw}" → ${hist.codigo_unico}`);
        itensEnriquecidos.push({
          ...item,
          codigo_unico: hist.codigo_unico,
          status_vinculo: 'vinculado',
          score_vinculo: hist.score || 1,
          origem_vinculo: 'historico',
        });
        continue;
      }

      // 2. Calcular score com produtos cadastrados
      let melhor = null;
      let melhorScore = 0;

      for (const p of produtosForn) {
        const descProd = [p.descricao_complementar, p.descricao_base, p.descricao_unificada, p.artigo_nome_comercial, p.cor_nome_comercial]
          .filter(Boolean).join(' ');
        const score = calcularScore(descRaw, descProd, p.cor_nome_comercial);
        if (score > melhorScore) {
          melhorScore = score;
          melhor = p;
        }
      }

      if (melhor && melhorScore >= 0.3 && melhor.codigo_unico) {
        logs.push(`✓ AUTO — "${descRaw}" → ${melhor.codigo_unico} (score: ${melhorScore.toFixed(2)})`);
        itensEnriquecidos.push({
          ...item,
          codigo_unico: melhor.codigo_unico,
          status_vinculo: 'vinculado',
          score_vinculo: melhorScore,
          origem_vinculo: 'auto',
        });
        aprendizados.push({
          empresa_id,
          fornecedor_id: fornNorm,
          descricao_nf: descRaw,
          descricao_normalizada: descNorm,
          codigo_unico: melhor.codigo_unico,
          score: melhorScore,
          origem: 'auto',
        });
      } else {
        logs.push(`⚠ PENDENTE — "${descRaw}" (score: ${melhorScore.toFixed(2)} < 0.3)`);
        itensEnriquecidos.push({
          ...item,
          codigo_unico: null,
          status_vinculo: 'pendente',
          score_vinculo: melhorScore,
          origem_vinculo: null,
        });
      }
    }

    // Salvar aprendizados
    if (aprendizados.length > 0) {
      try {
        await supabase
          .from('vinculo_produto_nf')
          .upsert(aprendizados, { onConflict: 'empresa_id,fornecedor_id,descricao_normalizada', ignoreDuplicates: false });
        logs.push(`💾 ${aprendizados.length} aprendizado(s) salvo(s)`);
      } catch (e) {
        logs.push(`Aviso: não foi possível salvar aprendizados — ${e.message}`);
      }
    }

    const vinculados = itensEnriquecidos.filter(i => i.status_vinculo === 'vinculado').length;
    const pendentes = itensEnriquecidos.filter(i => i.status_vinculo === 'pendente').length;

    return Response.json({ sucesso: true, itens: itensEnriquecidos, vinculados, pendentes, logs });

  } catch (err) {
    console.error('[vincularProdutoInteligente] ERRO:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});