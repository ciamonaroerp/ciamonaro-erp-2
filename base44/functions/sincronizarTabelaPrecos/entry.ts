import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { empresa_id, codigo_produto, artigo_codigo } = body;

    if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // 1. Buscar todos os dados necessários em paralelo
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
      supabase.from('produto_rendimento_valores').select('produto_id, rendimento_id, valor, descricao_artigo').eq('empresa_id', empresa_id).is('deleted_at', null),
    ]);

    const artigos = artigosRaw;

    // Mapa de config_vinculos por id
    const vinculosMap = {};
    (configVinculos || []).forEach(v => { vinculosMap[v.id] = v; });

    // 2. Mapas auxiliares
    const rendimentosMap = {};
    (rendimentos || []).forEach(r => { rendimentosMap[r.id] = r; });

    const valoresMap = {};
    (valores || []).forEach(v => {
      const artigo = v.descricao_artigo || '';
      valoresMap[`${v.produto_id}|${v.rendimento_id}|${artigo}`] = parseFloat(v.valor) || 0;
    });

    // composicoes por produto
    const composicoesPorProduto = {};
    (composicoes || []).forEach(c => {
      if (!composicoesPorProduto[c.produto_id]) composicoesPorProduto[c.produto_id] = {};
      const idx = c.variavel_index || 1;
      if (!composicoesPorProduto[c.produto_id][idx]) composicoesPorProduto[c.produto_id][idx] = [];
      composicoesPorProduto[c.produto_id][idx].push(c.rendimento_id);
    });

    // artigos por produto
    const artigosPorProduto = {};
    (artigos || []).forEach(a => {
      if (!artigosPorProduto[a.produto_id]) artigosPorProduto[a.produto_id] = [];
      artigosPorProduto[a.produto_id].push(a);
    });

    // 3. Montar registros consolidados
    const registros = [];
    const agora = new Date().toISOString();

    for (const produto of (produtos || [])) {
      const artigosDoProduto = artigosPorProduto[produto.id] || [];
      const composicoesDoProduto = composicoesPorProduto[produto.id] || {};
      const numComposicoes = Object.keys(composicoesDoProduto).length;

      const montarComposicoesJson = (descricaoArtigo, temArtigos) => {
        const descricaoArtigoSoNome = descricaoArtigo ? descricaoArtigo.split(' | ')[0].trim() : '';
        return Object.entries(composicoesDoProduto)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([idx, rids]) => {
            const itens = rids.map(rid => {
              let valor = 0;
              if (temArtigos) {
                valor = valoresMap[`${produto.id}|${rid}|${descricaoArtigo}`]
                     ?? valoresMap[`${produto.id}|${rid}|${descricaoArtigoSoNome}`]
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
        const isCompostoProd = (produto.num_variaveis || 1) >= 2;
        registros.push({
          empresa_id,
          produto_id: produto.id,
          codigo_produto: produto.codigo || '',
          nome_produto: produto.nome_produto,
          codigo_unico: null,
          artigo_nome: null,
          cor_nome: null,
          linha_nome: null,
          num_composicoes: numComposicoes,
          composicoes: composicoesJson,
          consumo_un,
          indice: null,
          custo_kg: null,
          custo_un: null,
          tipo_produto: isCompostoProd ? 'composto' : 'simples',
          status: 'ativo',
          sincronizado_em: agora,
          updated_at: agora,
          chave_equivalencia,
        });
      } else {
        for (const artigo of artigosDoProduto) {
          const vinculo = vinculosMap[artigo.vinculo_id] || {};
          const descricao_artigo = [vinculo.artigo_nome, vinculo.cor_nome, vinculo.linha_nome].filter(Boolean).join(' | ');
          const chave_equivalencia = await gerarChaveEquivalencia(produto.codigo_produto || '', descricao_artigo);
          const composicoesJson = montarComposicoesJson(descricao_artigo, true);
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
            empresa_id,
            produto_id: produto.id,
            codigo_produto: produto.codigo_produto || '',
            nome_produto: produto.nome_produto,
            codigo_unico: artigo.codigo_unico || null,
            artigo_nome: vinculo.artigo_nome || null,
            cor_nome: vinculo.cor_nome || null,
            linha_nome: vinculo.linha_nome || null,
            num_composicoes: numComposicoes,
            composicoes: composicoesJson,
            consumo_un,
            indice: isComposto ? (parseInt(artigo.variavel_index) || 1) : null,
            custo_kg: null,
            custo_un: null,
            tipo_produto: isComposto ? 'composto' : 'simples',
            deleted_at: null,
            status: 'ativo',
            sincronizado_em: agora,
            updated_at: agora,
            chave_equivalencia,
          });
        }
      }
    }

    // 4. Resolver grupo_id por chave_equivalencia
    const chaves = [...new Set(registros.map(r => r.chave_equivalencia).filter(Boolean))];
    const grupoMap = {};

    if (chaves.length > 0) {
      const { data: existentes } = await supabase
        .from('tabela_precos_sync')
        .select('chave_equivalencia, grupo_id')
        .eq('empresa_id', empresa_id)
        .in('chave_equivalencia', chaves)
        .not('grupo_id', 'is', null);

      (existentes || []).forEach(r => {
        if (r.chave_equivalencia && r.grupo_id) {
          grupoMap[r.chave_equivalencia] = r.grupo_id;
        }
      });
    }

    // Assign grupo_id
    for (const r of registros) {
      if (r.chave_equivalencia) {
        if (!grupoMap[r.chave_equivalencia]) {
          grupoMap[r.chave_equivalencia] = crypto.randomUUID();
        }
        r.grupo_id = grupoMap[r.chave_equivalencia];
      }
    }

    // Preservar custo_kg existente
    const codigosUnicos = registros.map(r => r.codigo_unico).filter(Boolean);
    const produtoIds = registros.map(r => r.produto_id).filter(Boolean);
    const custoKgExistente = {};
    const custoKgPorProduto = {};

    const queryPreserv = supabase
      .from('tabela_precos_sync')
      .select('codigo_unico, produto_id, custo_kg, custo_un')
      .eq('empresa_id', empresa_id)
      .not('custo_kg', 'is', null);
    if (produtoIds.length > 0) {
      queryPreserv.in('produto_id', produtoIds);
    }
    const { data: existentesComCusto } = await queryPreserv;
    (existentesComCusto || []).forEach(r => {
      if (r.codigo_unico) {
        custoKgExistente[r.codigo_unico] = { custo_kg: r.custo_kg };
      } else if (r.produto_id) {
        custoKgPorProduto[r.produto_id] = { custo_kg: r.custo_kg };
      }
    });

    // Mesclar custo_kg existente nos registros
    for (const r of registros) {
      let mergedCustoKg = null;

      if (r.codigo_unico && custoKgExistente[r.codigo_unico]) {
        mergedCustoKg = custoKgExistente[r.codigo_unico].custo_kg;
      } else if (!r.codigo_unico && r.produto_id && custoKgPorProduto[r.produto_id]) {
        mergedCustoKg = custoKgPorProduto[r.produto_id].custo_kg;
      }

      r.custo_kg = mergedCustoKg;

      const consumoNum = parseFloat(String(r.consumo_un || 0).replace(',', '.'));
      const custoKgNum = parseFloat(String(mergedCustoKg || 0).replace(',', '.'));
      
      if (consumoNum > 0 && custoKgNum > 0) {
        const resultado = consumoNum * custoKgNum;
        r.custo_un = parseFloat(resultado.toFixed(3));
      } else {
        r.custo_un = null;
      }
    }

    // Sincronizar registros
    if (!codigo_produto) {
      const produtosAtivosIds = new Set((produtos || []).map(p => p.id));

      const { data: registrosExistentes } = await supabase
        .from('tabela_precos_sync')
        .select('id, produto_id')
        .eq('empresa_id', empresa_id);

      const registrosObsoletos = (registrosExistentes || []).filter(r => !produtosAtivosIds.has(r.produto_id));

      if (registrosObsoletos.length > 0) {
        const { error: updateError } = await supabase
          .from('tabela_precos_sync')
          .update({ status: 'inativo' })
          .in('id', registrosObsoletos.map(r => r.id));

        if (updateError) {
          console.error('[sincronizarTabelaPrecos] Update error:', updateError.message);
          return Response.json({ error: updateError.message }, { status: 400 });
        }
      }

      const registrosComArtigo = registros.filter(r => r.codigo_unico);
      const registrosSemArtigo = registros.filter(r => !r.codigo_unico);
      const BATCH = 100;
      let totalUpsertados = 0;

      for (let i = 0; i < registrosComArtigo.length; i += BATCH) {
        const lote = registrosComArtigo.slice(i, i + BATCH);
        console.log(`[sincronizarTabelaPrecos] Lote com artigo ${i / BATCH + 1}: ${lote.length} registros`);
        
        const { error: upsertError } = await supabase
          .from('tabela_precos_sync')
          .upsert(lote, { onConflict: 'produto_id,codigo_unico', ignoreDuplicates: false });
        
        if (upsertError) {
          console.error('[sincronizarTabelaPrecos] Upsert error (com artigo):', upsertError.message);
          return Response.json({ error: upsertError.message }, { status: 400 });
        }
        totalUpsertados += lote.length;
      }

      for (const reg of registrosSemArtigo) {
        const { data: existente } = await supabase
          .from('tabela_precos_sync')
          .select('id')
          .eq('empresa_id', empresa_id)
          .eq('produto_id', reg.produto_id)
          .is('codigo_unico', null)
          .maybeSingle();
        
        if (existente) {
          const { error: updErr } = await supabase.from('tabela_precos_sync').update(reg).eq('id', existente.id);
          if (updErr) { 
            console.error('[sincronizarTabelaPrecos] Update sem artigo error:', updErr.message); 
            return Response.json({ error: updErr.message }, { status: 400 }); 
          }
        } else {
          const { error: insErr } = await supabase.from('tabela_precos_sync').insert(reg);
          if (insErr) { 
            console.error('[sincronizarTabelaPrecos] Insert sem artigo error:', insErr.message); 
            return Response.json({ error: insErr.message }, { status: 400 }); 
          }
        }
        totalUpsertados++;
      }

      console.log(`[sincronizarTabelaPrecos] Sincronização geral concluída: ${totalUpsertados} registros processados`);
    } else {
      const registrosComArtigoInd = registros.filter(r => r.codigo_unico);
      const registrosSemArtigoInd = registros.filter(r => !r.codigo_unico);
      let totalUpsertados = 0;
      const BATCH = 100;
      console.log(`[sincronizarTabelaPrecos] Sincronização individual do produto: ${codigo_produto} (${registros.length} registros, ${registrosComArtigoInd.length} com artigo, ${registrosSemArtigoInd.length} sem artigo)`);

      for (let i = 0; i < registrosComArtigoInd.length; i += BATCH) {
        const lote = registrosComArtigoInd.slice(i, i + BATCH);
        const { error: upsertError } = await supabase
          .from('tabela_precos_sync')
          .upsert(lote, { onConflict: 'produto_id,codigo_unico', ignoreDuplicates: false });
        
        if (upsertError) {
          console.error('[sincronizarTabelaPrecos] Upsert error (com artigo ind):', upsertError.message);
          return Response.json({ error: upsertError.message }, { status: 400 });
        }
        totalUpsertados += lote.length;
      }

      for (const reg of registrosSemArtigoInd) {
        const { data: existente } = await supabase
          .from('tabela_precos_sync')
          .select('id')
          .eq('empresa_id', empresa_id)
          .eq('produto_id', reg.produto_id)
          .is('codigo_unico', null)
          .maybeSingle();
        
        if (existente) {
          const { error: updErr } = await supabase.from('tabela_precos_sync').update(reg).eq('id', existente.id);
          if (updErr) { 
            console.error('[sincronizarTabelaPrecos] Update sem artigo ind error:', updErr.message); 
            return Response.json({ error: updErr.message }, { status: 400 }); 
          }
        } else {
          const { error: insErr } = await supabase.from('tabela_precos_sync').insert(reg);
          if (insErr) { 
            console.error('[sincronizarTabelaPrecos] Insert sem artigo ind error:', insErr.message); 
            return Response.json({ error: insErr.message }, { status: 400 }); 
          }
        }
        totalUpsertados++;
      }
      console.log(`[sincronizarTabelaPrecos] Sincronização individual concluída: ${totalUpsertados} registros processados`);
    }

    console.log('[sincronizarTabelaPrecos] Sincronização concluída sem deletar registros');

    const produtosIds = (produtos || []).map(p => p.id);
    if (produtosIds.length > 0) {
      const { error: syncErr } = await supabase
        .from('produto_rendimento_valores')
        .update({ sincronizado: true })
        .eq('empresa_id', empresa_id)
        .in('produto_id', produtosIds)
        .is('deleted_at', null);
      if (syncErr) console.error('[sincronizarTabelaPrecos] Erro ao marcar sincronizado:', syncErr.message);
      else console.log(`[sincronizarTabelaPrecos] Marcados como sincronizados: ${produtosIds.length} produto(s)`);
    }

    return Response.json({ success: true, total: registros.length, mode: codigo_produto ? 'individual' : 'geral' });
  } catch (error) {
    console.error('[sincronizarTabelaPrecos] Exception:', error.message);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});