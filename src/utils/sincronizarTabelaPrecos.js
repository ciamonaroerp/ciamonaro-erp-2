import { supabase } from "@/components/lib/supabaseClient";

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function gerarChaveEquivalencia(codigoProduto, descricaoArtigo) {
  const base = normalizar(codigoProduto) + '|' + normalizar(descricaoArtigo || '');
  const encoder = new TextEncoder();
  const data = encoder.encode(base);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sincroniza a tabela_precos_sync para um produto (ou todos) diretamente via Supabase.
 * Substitui a backend function sincronizarTabelaPrecos para funcionar no Vercel.
 */
export async function sincronizarTabelaPrecos({ empresa_id, codigo_produto, artigo_codigo }) {
  if (!empresa_id) throw new Error('empresa_id obrigatório');

  // 1. Buscar dados em paralelo
  const [
    { data: produtos },
    { data: artigosRaw },
    { data: configVinculos },
    { data: composicoes },
    { data: rendimentos },
    { data: valores },
  ] = await Promise.all([
    (() => {
      let q = supabase.from('produto_comercial').select('id, codigo_produto, nome_produto, num_variaveis').eq('empresa_id', empresa_id).is('deleted_at', null);
      if (codigo_produto) q = q.eq('codigo_produto', codigo_produto);
      return q;
    })(),
    (() => {
      let q = supabase.from('produto_comercial_artigo').select('id, produto_id, vinculo_id, codigo_unico, artigo_codigo, variavel_index').eq('empresa_id', empresa_id).is('deleted_at', null);
      if (codigo_produto && artigo_codigo) q = q.eq('artigo_codigo', artigo_codigo);
      return q;
    })(),
    supabase.from('config_vinculos').select('id, artigo_nome, cor_nome, linha_nome').eq('empresa_id', empresa_id),
    supabase.from('produto_composicao').select('produto_id, rendimento_id, variavel_index').eq('empresa_id', empresa_id),
    supabase.from('produto_rendimentos').select('id, nome').eq('empresa_id', empresa_id).is('deleted_at', null),
    supabase.from('produto_rendimento_valores').select('produto_id, rendimento_id, rendimento_valor, descricao_artigo, vinculo_id').eq('empresa_id', empresa_id).is('deleted_at', null),
  ]);

  const vinculosMap = {};
  (configVinculos || []).forEach(v => { vinculosMap[v.id] = v; });

  const rendimentosMap = {};
  (rendimentos || []).forEach(r => { rendimentosMap[r.id] = r; });

  const valoresMap = {};
  (valores || []).forEach(v => {
    const valorNum = parseFloat(v.rendimento_valor) || 0;
    const artigo = v.descricao_artigo || '';
    valoresMap[`${v.produto_id}|${v.rendimento_id}|${artigo}`] = valorNum;
    if (v.vinculo_id) {
      valoresMap[`${v.produto_id}|${v.rendimento_id}|vinculo:${v.vinculo_id}`] = valorNum;
    }
  });

  const composicoesPorProduto = {};
  (composicoes || []).forEach(c => {
    if (!composicoesPorProduto[c.produto_id]) composicoesPorProduto[c.produto_id] = {};
    const idx = c.variavel_index || 1;
    if (!composicoesPorProduto[c.produto_id][idx]) composicoesPorProduto[c.produto_id][idx] = [];
    composicoesPorProduto[c.produto_id][idx].push(c.rendimento_id);
  });

  const artigosPorProduto = {};
  (artigosRaw || []).forEach(a => {
    if (!artigosPorProduto[a.produto_id]) artigosPorProduto[a.produto_id] = [];
    artigosPorProduto[a.produto_id].push(a);
  });

  // 2. Montar registros
  const registros = [];
  const agora = new Date().toISOString();

  for (const produto of (produtos || [])) {
    const artigosDoProduto = artigosPorProduto[produto.id] || [];
    const composicoesDoProduto = composicoesPorProduto[produto.id] || {};
    const numComposicoes = Object.keys(composicoesDoProduto).length;

    const montarComposicoesJson = (descricaoArtigo, temArtigos, vinculo_id_artigo) => {
      const descricaoArtigoSoNome = descricaoArtigo ? descricaoArtigo.split(' | ')[0].trim() : '';
      return Object.entries(composicoesDoProduto)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([idx, rids]) => {
          const itens = rids.map(rid => {
            let valor = 0;
            if (temArtigos) {
              valor = valoresMap[`${produto.id}|${rid}|${descricaoArtigo}`]
                   ?? valoresMap[`${produto.id}|${rid}|${descricaoArtigoSoNome}`]
                   ?? (vinculo_id_artigo ? valoresMap[`${produto.id}|${rid}|vinculo:${vinculo_id_artigo}`] : undefined)
                   ?? 0;
            } else {
              valor = valoresMap[`${produto.id}|${rid}|`] ?? 0;
            }
            return { rendimento_id: rid, nome: rendimentosMap[rid]?.nome || rid, valor: parseFloat(valor.toFixed(3)) };
          });
          const valor_total = parseFloat(itens.reduce((s, i) => s + i.valor, 0).toFixed(3));
          return { indice: Number(idx), itens, valor_total };
        });
    };

    if (artigosDoProduto.length === 0) {
      const composicoesJson = montarComposicoesJson('', false);
      const consumo_un = parseFloat(composicoesJson.reduce((s, c) => s + (c.valor_total || 0), 0).toFixed(3));
      const chave_equivalencia = await gerarChaveEquivalencia(produto.codigo_produto || '', '');
      const isComposto = (produto.num_variaveis || 1) >= 2;
      registros.push({
        empresa_id, produto_id: produto.id,
        codigo_produto: produto.codigo_produto || '',
        nome_produto: produto.nome_produto,
        codigo_unico: null, artigo_nome: null, cor_nome: null, linha_nome: null,
        num_composicoes: numComposicoes, composicoes: composicoesJson, consumo_un,
        indice: numComposicoes >= 1 ? 1 : null, custo_kg: null, custo_un: null,
        tipo_produto: isComposto ? 'composto' : 'simples',
        status: 'ativo', sincronizado_em: agora, updated_at: agora, chave_equivalencia,
      });
    } else {
      for (const artigo of artigosDoProduto) {
        const vinculo = vinculosMap[artigo.vinculo_id] || {};
        const descricao_artigo = [vinculo.artigo_nome, vinculo.cor_nome, vinculo.linha_nome].filter(Boolean).join(' | ');
        const chave_equivalencia = await gerarChaveEquivalencia(produto.codigo_produto || '', descricao_artigo);
        const composicoesJson = montarComposicoesJson(descricao_artigo, true, artigo.vinculo_id);
        const isComposto = (produto.num_variaveis || 1) >= 2;
        let consumo_un;
        if (isComposto) {
          const indiceDoProduto = parseInt(artigo.variavel_index) || 1;
          const composicaoDoIndice = composicoesJson.find(c => c.indice === indiceDoProduto);
          consumo_un = parseFloat((composicaoDoIndice?.valor_total || 0).toFixed(3));
        } else {
          consumo_un = parseFloat(composicoesJson.reduce((s, c) => s + (c.valor_total || 0), 0).toFixed(3));
        }
        registros.push({
          empresa_id, produto_id: produto.id,
          codigo_produto: produto.codigo_produto || '',
          nome_produto: produto.nome_produto,
          codigo_unico: artigo.codigo_unico || null,
          artigo_nome: vinculo.artigo_nome || null,
          cor_nome: vinculo.cor_nome || null,
          linha_nome: vinculo.linha_nome || null,
          num_composicoes: numComposicoes, composicoes: composicoesJson, consumo_un,
          indice: parseInt(artigo.variavel_index) || 1,
          custo_kg: null, custo_un: null,
          tipo_produto: isComposto ? 'composto' : 'simples',
          deleted_at: null, status: 'ativo', sincronizado_em: agora, updated_at: agora, chave_equivalencia,
        });
      }
    }
  }

  // 3. Resolver grupo_id
  const chaves = [...new Set(registros.map(r => r.chave_equivalencia).filter(Boolean))];
  const grupoMap = {};
  if (chaves.length > 0) {
    const { data: existentes } = await supabase
      .from('tabela_precos_sync').select('chave_equivalencia, grupo_id')
      .eq('empresa_id', empresa_id).in('chave_equivalencia', chaves).not('grupo_id', 'is', null);
    (existentes || []).forEach(r => { if (r.grupo_id) grupoMap[r.chave_equivalencia] = r.grupo_id; });
  }
  for (const r of registros) {
    if (r.chave_equivalencia) {
      if (!grupoMap[r.chave_equivalencia]) grupoMap[r.chave_equivalencia] = crypto.randomUUID();
      r.grupo_id = grupoMap[r.chave_equivalencia];
    }
  }

  // 4. Preservar custo_kg existente
  const produtoIds = registros.map(r => r.produto_id).filter(Boolean);
  const custoKgExistente = {};
  const custoKgPorProduto = {};
  if (produtoIds.length > 0) {
    const { data: existentesComCusto } = await supabase
      .from('tabela_precos_sync').select('codigo_unico, produto_id, custo_kg')
      .eq('empresa_id', empresa_id).not('custo_kg', 'is', null).in('produto_id', produtoIds);
    (existentesComCusto || []).forEach(r => {
      if (r.codigo_unico) custoKgExistente[r.codigo_unico] = r.custo_kg;
      else if (r.produto_id) custoKgPorProduto[r.produto_id] = r.custo_kg;
    });
  }
  for (const r of registros) {
    const mergedCustoKg = r.codigo_unico ? (custoKgExistente[r.codigo_unico] ?? null) : (custoKgPorProduto[r.produto_id] ?? null);
    r.custo_kg = mergedCustoKg;
    const consumoNum = parseFloat(String(r.consumo_un || 0).replace(',', '.'));
    const custoKgNum = parseFloat(String(mergedCustoKg || 0).replace(',', '.'));
    r.custo_un = (consumoNum > 0 && custoKgNum > 0) ? parseFloat((consumoNum * custoKgNum).toFixed(3)) : null;
  }

  // 5. Salvar registros via update/insert (sem dependência de constraint única)
  for (const reg of registros) {
    let query = supabase.from('tabela_precos_sync').select('id').eq('empresa_id', empresa_id).eq('produto_id', reg.produto_id);
    if (reg.codigo_unico) {
      query = query.eq('codigo_unico', reg.codigo_unico);
    } else {
      query = query.is('codigo_unico', null);
    }
    const { data: existente } = await query.maybeSingle();
    if (existente) {
      const { error } = await supabase.from('tabela_precos_sync').update(reg).eq('id', existente.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('tabela_precos_sync').insert(reg);
      if (error) throw new Error(error.message);
    }
  }

  // 6. Marcar como sincronizado
  if (produtoIds.length > 0) {
    await supabase.from('produto_rendimento_valores').update({ sincronizado: true })
      .eq('empresa_id', empresa_id).in('produto_id', produtoIds).is('deleted_at', null);
  }

  return { success: true, total: registros.length };
}