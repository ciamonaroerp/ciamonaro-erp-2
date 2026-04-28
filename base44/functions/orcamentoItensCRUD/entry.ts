/**
 * orcamentoItensCRUD — CRUD simplificado para itens de orçamento
 * Usa supabaseCRUD para CRUD básico + queries auxiliares
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { action, orcamento_id, id, data: bodyData, empresa_id } = body;

    // ─── LISTAR ITENS ─────────────────────────────────────────────────────────
    if (action === 'listar') {
      if (!orcamento_id) return Response.json({ error: '"orcamento_id" é obrigatório' }, { status: 400 });
      const { data, error } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamento_id)
        .is('deleted_at', null)
        .order('sequencia', { ascending: true });
      if (error) return Response.json({ error: error.message }, { status: 500 });

      const fromJson = (v) => { if (!v) return []; if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v; };

      // Coleta todos os IDs de itens adicionais para buscar nomes corretos na config_dependencias
      const todosItensAdicionais = (data || []).flatMap(item => {
        const ia = item.itens_adicionais ? fromJson(item.itens_adicionais) : [];
        return ia.map(a => a?.id).filter(Boolean);
      });
      const idsUnicos = [...new Set(todosItensAdicionais.map(String))];
      let nomesDependencias = {};
      if (idsUnicos.length > 0) {
        const { data: depRows } = await supabase
          .from('config_dependencias')
          .select('id, tipo_dependencia')
          .in('id', idsUnicos);
        (depRows || []).forEach(r => { nomesDependencias[String(r.id)] = r.tipo_dependencia; });
      }

      const itensProcessados = (data || []).map(item => {
        let extra = {};
        if (item.observacoes && typeof item.observacoes === 'string') {
          try { extra = JSON.parse(item.observacoes); } catch (e) {}
        }
        const artigoNome = item.artigo_nome || extra._artigo_nome || null;
        const linhaNome = item.linha_nome || extra._linha_nome || null;
        const corNome = item.cor_nome || extra._cor_nome || null;
        const nomeProduto = item.nome_produto || extra._nome_produto || null;
        const acabamentos = item.acabamentos ? fromJson(item.acabamentos) : (extra._acabamentos || []);
        const personalizacoes = item.personalizacoes ? fromJson(item.personalizacoes) : (extra._personalizacoes || []);
        const operacoes = item.operacoes ? fromJson(item.operacoes) : (extra._operacoes || []);
        const itensAdicionaisRaw = item.itens_adicionais ? fromJson(item.itens_adicionais) : (extra._itens_adicionais || []);

        // Corrige descricao dos itens adicionais usando o nome real da config_dependencias
        const itensAdicionais = itensAdicionaisRaw.map(a => ({
          ...a,
          descricao: (a?.id && nomesDependencias[String(a.id)]) ? nomesDependencias[String(a.id)] : (a?.descricao || a?.tipo_dependencia || ''),
        }));

        return {
          ...item,
          artigo_nome: artigoNome,
          linha_nome: linhaNome,
          cor_nome: corNome,
          nome_produto: nomeProduto,
          acabamentos,
          personalizacoes,
          operacoes,
          itens_adicionais: itensAdicionais,
        };
      });

      return Response.json({ data: itensProcessados });
    }

    // ─── DIAGNOSTICAR CONSTRAINT ─────────────────────────────────────────────
    if (action === 'diagnosticar_constraint') {
      const testes = [
        { label: 'p100_s0', payload: { orcamento_id: '00000000-0000-0000-0000-000000000001', quantidade: 1, valor_unitario: 10, subtotal: 10, produto_percentual: 100, servico_percentual: 0 } },
        { label: 'p70_s30', payload: { orcamento_id: '00000000-0000-0000-0000-000000000001', quantidade: 1, valor_unitario: 10, subtotal: 10, produto_percentual: 70, servico_percentual: 30 } },
        { label: 'p50_s50_tipoitem', payload: { orcamento_id: '00000000-0000-0000-0000-000000000001', quantidade: 1, valor_unitario: 10, subtotal: 10, produto_percentual: 50, servico_percentual: 50, tipo_item: 'Produto' } },
        { label: 'sem_percentuais', payload: { orcamento_id: '00000000-0000-0000-0000-000000000001', quantidade: 1, valor_unitario: 10, subtotal: 10 } },
      ];
      const resultados = {};
      for (const t of testes) {
        const { error } = await supabase.from('orcamento_itens').insert(t.payload);
        resultados[t.label] = error ? error.message : 'OK';
        if (!error) await supabase.from('orcamento_itens').delete().eq('orcamento_id', '00000000-0000-0000-0000-000000000001');
      }
      return Response.json({ resultados });
    }

    // ─── INSPECIONAR SCHEMA ──────────────────────────────────────────────────
    if (action === 'inspecionar_schema') {
      // Tenta inserir um registro mínimo para descobrir quais colunas existem
      const minPayload = { orcamento_id: '00000000-0000-0000-0000-000000000000', sequencia: 999, tipo_item: 'SCHEMA_CHECK', quantidade: 0, valor_unitario: 0, subtotal: 0 };
      const testColunas = ['nome_produto', 'produto_id', 'nome_linha_comercial', 'nome_cor', 'codigo_unico', 'acabamentos', 'personalizacoes', 'operacoes', 'produto_percentual', 'servico_percentual', 'observacoes'];
      const colunasTeste = {};
      for (const col of testColunas) {
        const testRow = { ...minPayload, [col]: null };
        const { error } = await supabase.from('orcamento_itens').insert(testRow);
        colunasTeste[col] = !error || !error.message?.includes(`'${col}'`);
        if (!error) {
          // Remove o registro de teste
          await supabase.from('orcamento_itens').delete().eq('tipo_item', 'SCHEMA_CHECK');
        }
      }
      return Response.json({ colunasTeste });
    }

    // ─── PRÓXIMA SEQUÊNCIA ────────────────────────────────────────────────────
    if (action === 'proxima_sequencia') {
      if (!orcamento_id) return Response.json({ data: 1 });
      const { data } = await supabase
        .from('orcamento_itens')
        .select('sequencia')
        .eq('orcamento_id', orcamento_id)
        .is('deleted_at', null)
        .order('sequencia', { ascending: false })
        .limit(1);
      const proxima = (data?.[0]?.sequencia || 0) + 1;
      return Response.json({ data: proxima });
    }

    // ─── HELPER: buscar acabamentos e montar JSONB + custo ────────────────────
    const buscarAcabamentosJsonb = async (acabamentosIds, empId) => {
      if (!Array.isArray(acabamentosIds) || acabamentosIds.length === 0) {
        return { jsonb: [], custo: 0 };
      }
      const idsValidos = acabamentosIds.filter(id => id && String(id).length > 0);
      if (idsValidos.length === 0) return { jsonb: [], custo: 0 };

      let query = supabase
        .from('config_acabamentos')
        .select('id, nome_acabamento, valor_acab_un')
        .in('id', idsValidos)
        .is('deleted_at', null);

      if (empId) query = query.eq('empresa_id', empId);

      const { data: acbRows } = await query;
      if (!acbRows || acbRows.length === 0) return { jsonb: [], custo: 0 };

      const jsonb = acbRows.map(row => ({
        id: row.id,
        descricao: row.nome_acabamento,
        valor: parseFloat(row.valor_acab_un) || 0,
      }));
      const custo = jsonb.reduce((s, r) => s + r.valor, 0);
      return { jsonb, custo };
    };

    // Compatibilidade: mantém calcularCustoAcabamento apontando para o novo helper
    const calcularCustoAcabamento = async (acabamentosIds, empId) => {
      const { custo } = await buscarAcabamentosJsonb(acabamentosIds, empId);
      return custo;
    };

    // ─── HELPER: calcular custo_personalizacao a partir do JSONB de personalizações ──
    const calcularCustoPersonalizacao = (personalizacoesJsonb) => {
      if (!Array.isArray(personalizacoesJsonb)) return 0;
      let total = 0;
      for (const p of personalizacoesJsonb) {
        total += Number(p?.valor) || 0;
      }
      return total;
    };

    // ─── HELPER: montar JSONB de personalizações a partir dos IDs + inputs ───────
    const montarPersonalizacoesJsonb = async (personalizacoesPayload, empId) => {
      // personalizacoesPayload: [{id, cores, posicoes, valor_variavel}] vindo do frontend
      if (!Array.isArray(personalizacoesPayload) || personalizacoesPayload.length === 0) {
        return { jsonb: [], custo: 0 };
      }
      const ids = personalizacoesPayload.map(p => p.id).filter(Boolean);
      if (ids.length === 0) return { jsonb: [], custo: 0 };

      let q = supabase
        .from('config_personalizacao')
        .select('id, tipo_personalizacao, dependencias_pers, valor_pers_un')
        .in('id', ids)
        .is('deleted_at', null);
      if (empId) q = q.eq('empresa_id', empId);
      const { data: configRows } = await q;
      if (!configRows || configRows.length === 0) return { jsonb: [], custo: 0 };

      const jsonb = [];
      for (const cfg of configRows) {
        const input = personalizacoesPayload.find(p => String(p.id) === String(cfg.id));
        if (!input) continue;
        const dep = (typeof cfg.dependencias_pers === 'string')
          ? JSON.parse(cfg.dependencias_pers || '{}')
          : (cfg.dependencias_pers || {});
        const valorUn = parseFloat(cfg.valor_pers_un) || 0;
        const cores = dep.usa_cores ? (parseInt(input.cores) || 0) : 0;
        const posicoes = dep.usa_posicoes ? (parseInt(input.posicoes) || 0) : 0;
        const valorVariavel = dep.usa_valor_variavel ? (parseFloat(input.valor_variavel) || 0) : 0;
        // Cálculo backend: cada combinação de cores/posicoes multiplica valor_un; valor_variavel soma direto
        let valorFinal = valorVariavel;
        if (dep.usa_valor_unitario) {
          if (cores > 0 && posicoes > 0) valorFinal += cores * posicoes * valorUn;
          else if (cores > 0) valorFinal += cores * valorUn;
          else if (posicoes > 0) valorFinal += posicoes * valorUn;
          else valorFinal += valorUn;
        }
        jsonb.push({
          id: cfg.id,
          descricao: cfg.tipo_personalizacao,
          cores: cores || null,
          posicoes: posicoes || null,
          valor: valorFinal,
        });
      }
      const custo = jsonb.reduce((s, r) => s + (r.valor || 0), 0);
      return { jsonb, custo };
    };

    // ─── HELPER: soma TODOS os valores de acabamentos + itens_adicionais ────────
    const calcularSomaAcabItens = (acabamentos, itensAdicionais) => {
      let total = 0;
      if (Array.isArray(acabamentos)) {
        for (const item of acabamentos) {
          const valor = Number(item?.valor);
          if (!isNaN(valor)) total += valor;
        }
      }
      if (Array.isArray(itensAdicionais)) {
        for (const item of itensAdicionais) {
          const valor = Number(item?.valor);
          if (!isNaN(valor)) total += valor;
        }
      }
      return total;
    };

    // ─── HELPER: soma apenas os valores de itens_adicionais ──────────────────
    const calcularSomaItensAdicionais = (itensAdicionais) => {
      if (!Array.isArray(itensAdicionais)) return 0;
      return itensAdicionais.reduce((acc, item) => acc + (Number(item?.valor) || 0), 0);
    };

    // ─── HELPER: calcular TTE (tempo_personalizacao) via config_estamparia ────
    const calcularTTE = async (quantidade, soma_cores, soma_posicoes, empId) => {
      if (!quantidade || !soma_cores || !soma_posicoes) return null;
      try {
        const res = await base44.functions.invoke('calcularTempoProducao', {
          empresa_id: empId,
          quantidade,
          soma_cores,
          soma_posicoes,
        });
        const data = res?.data;
        if (data?.dados_insuficientes || !data?.resultado) return null;
        return Math.round(data.resultado.tte);
      } catch (e) {
        console.error('[calcularTTE] Erro ao invocar calcularTempoProducao:', e.message);
        return null;
      }
    };

    // ─── HELPER: soma posicoes e cores das personalizacoes (jsonb) ────────────
    const calcularSomaPosicoes = (personalizacoesJsonb) => {
      if (!Array.isArray(personalizacoesJsonb)) return 0;
      return personalizacoesJsonb.reduce((acc, p) => acc + (Number(p?.posicoes) || 0), 0);
    };

    const calcularSomaCores = (personalizacoesJsonb) => {
      if (!Array.isArray(personalizacoesJsonb)) return 0;
      return personalizacoesJsonb.reduce((acc, p) => acc + (Number(p?.cores) || 0), 0);
    };

    // ─── INSERIR ──────────────────────────────────────────────────────────────
    if (action === 'inserir') {
      if (!bodyData || !orcamento_id) return Response.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
      
      const toJson = (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null;
      const produtoPercentual = parseFloat(bodyData.produto_percentual ?? 100);
      const servicoPercentual = parseFloat(bodyData.servico_percentual ?? 0);
      const valorUnitario = parseFloat(bodyData.valor_unitario || 0);
      const quantidade = parseInt(bodyData.quantidade || 1);
      const subtotal = valorUnitario * quantidade;

      // Verifica se é produto composto (codigo_unico é JSON com múltiplos índices)
      let tecidosSelecionados = {};
      try {
        if (bodyData.codigo_unico && String(bodyData.codigo_unico).startsWith('{')) {
          tecidosSelecionados = JSON.parse(bodyData.codigo_unico);
        } else if (bodyData.codigo_unico) {
          tecidosSelecionados = { 1: bodyData.codigo_unico };
        }
      } catch (e) {
        tecidosSelecionados = { 1: bodyData.codigo_unico || null };
      }

      // ── CUSTO_UN: busca custo_un da tabela_precos_sync (ADITIVO, não sobrescreve se já existe)
      let custoUnInserir = (bodyData.custo_un !== null && bodyData.custo_un !== undefined) ? bodyData.custo_un : null;
      if (bodyData.produto_id && custoUnInserir === null) {
        const { data: custoRows } = await supabase
          .from('tabela_precos_sync')
          .select('custo_un')
          .eq('produto_id', bodyData.produto_id)
          .is('deleted_at', null)
          .limit(1);
        if (custoRows && custoRows.length > 0) custoUnInserir = custoRows[0].custo_un ?? null;
      }

      // ── ACABAMENTOS: busca no backend e monta JSONB {id, descricao, valor}
      const acabamentosIdsInserir = Array.isArray(bodyData.acabamentos_ids) ? bodyData.acabamentos_ids : [];
      const { jsonb: acabamentosJsonbInserir, custo: custoAcabamentoInserir } = await buscarAcabamentosJsonb(acabamentosIdsInserir, empresa_id || bodyData.empresa_id);

      // ── PERSONALIZAÇÕES: monta JSONB com cálculo backend
      const { jsonb: personalizacoesJsonbInserir, custo: custoPersonalizacaoInserir } = await montarPersonalizacoesJsonb(
        Array.isArray(bodyData.personalizacoes_payload) ? bodyData.personalizacoes_payload : [],
        empresa_id || bodyData.empresa_id
      );

      const registrosInserir = [];
      const todasOpções = {};

      // Se composto com múltiplos índices: criar 1 registro por índice
      if (Object.keys(tecidosSelecionados).length > 1) {
        // Busca metadados (linha, cor, artigo, custo_un) de cada tecido pelo id específico
        const custoUnPorIndice = {};
        for (const [indice, tecidoId] of Object.entries(tecidosSelecionados)) {
          const { data: tdRow } = await supabase.from('tabela_precos_sync').select('linha_nome, cor_nome, artigo_nome, custo_un').eq('id', tecidoId).maybeSingle();
          if (tdRow) {
            todasOpções[indice] = { linha_nome: tdRow.linha_nome || null, cor_nome: tdRow.cor_nome || null, artigo_nome: tdRow.artigo_nome || null };
            custoUnPorIndice[indice] = tdRow.custo_un ?? null;
          }
        }

        const somaAcabItensInserir = calcularSomaAcabItens(acabamentosJsonbInserir, bodyData.itens_adicionais || []);

        // Cria 1 registro por índice
        for (const indice of Object.keys(tecidosSelecionados).sort((a, b) => Number(a) - Number(b))) {
          const meta = todasOpções[indice] || {};
          // REGRA: custo_acabamento somente no índice 1; custo_un usa o valor específico do tecido de cada índice
          const custoAcabIndice = parseInt(indice) === 1 ? custoAcabamentoInserir : 0;
          const custoUnIndice = custoUnPorIndice[indice] ?? 0;
          const somaIndice = parseInt(indice) === 1 ? somaAcabItensInserir : 0;
          registrosInserir.push({
            orcamento_id,
            sequencia: parseInt(bodyData.sequencia || 1),
            indice: parseInt(indice),
            tipo_item: bodyData.tipo_item || 'Produto',
            produto_id: bodyData.produto_id || null,
            nome_produto: bodyData.nome_produto || null,
            quantidade,
            valor_unitario: valorUnitario,
            subtotal,
            ...(custoUnIndice !== null ? { custo_un: custoUnIndice } : {}),
            custo_acabamento: custoAcabIndice,
            soma_acab_itens: somaIndice,
            soma_itens_adicionais: parseInt(indice) === 1 ? calcularSomaItensAdicionais(bodyData.itens_adicionais || []) : 0,
            soma_posicoes: parseInt(indice) === 1 ? calcularSomaPosicoes(personalizacoesJsonbInserir) : 0,
            soma_cores: parseInt(indice) === 1 ? calcularSomaCores(personalizacoesJsonbInserir) : 0,
            linha_nome: meta.linha_nome || null,
            artigo_nome: meta.artigo_nome || null,
            cor_nome: meta.cor_nome || null,
            codigo_unico: tecidosSelecionados[indice],
            resumo_linha_artigo_cor: bodyData.resumo_linha_artigo_cor || null,
            acabamentos: toJson(acabamentosJsonbInserir),
            personalizacoes: toJson(personalizacoesJsonbInserir),
            custo_personalizacao: parseInt(indice) === 1 ? custoPersonalizacaoInserir : 0,
            itens_adicionais: toJson(bodyData.itens_adicionais || []),
            operacoes: toJson(bodyData.operacoes || []),
            produto_percentual: produtoPercentual,
            servico_percentual: servicoPercentual,
          });
        }
      } else {
        // Simples: 1 registro com indice = 1
        let linhaOicial = null, corOficial = null, artigoOficial = null;
        const codigoUnicoSingle = tecidosSelecionados[1];
        if (codigoUnicoSingle) {
          const { data: tdRow } = await supabase.from('tabela_precos_sync').select('linha_nome, cor_nome, artigo_nome, custo_un').eq('id', codigoUnicoSingle).maybeSingle();
          if (tdRow) {
            linhaOicial = tdRow.linha_nome || null;
            corOficial = tdRow.cor_nome || null;
            artigoOficial = tdRow.artigo_nome || null;
            // Usa custo_un do tecido específico selecionado (sobrepõe busca genérica por produto_id)
            if (tdRow.custo_un !== null && tdRow.custo_un !== undefined) {
              custoUnInserir = tdRow.custo_un;
            }
          }
        }

        const somaAcabItensSingle = calcularSomaAcabItens(acabamentosJsonbInserir, bodyData.itens_adicionais || []);
        registrosInserir.push({
           orcamento_id,
           sequencia: parseInt(bodyData.sequencia || 1),
           indice: 1,
           tipo_item: bodyData.tipo_item || 'Produto',
           produto_id: bodyData.produto_id || null,
           nome_produto: bodyData.nome_produto || null,
           quantidade,
           valor_unitario: valorUnitario,
           subtotal,
           ...(custoUnInserir !== null ? { custo_un: custoUnInserir } : {}),
           custo_acabamento: custoAcabamentoInserir,
           soma_acab_itens: somaAcabItensSingle,
           soma_itens_adicionais: calcularSomaItensAdicionais(bodyData.itens_adicionais || []),
           soma_posicoes: calcularSomaPosicoes(personalizacoesJsonbInserir),
           soma_cores: calcularSomaCores(personalizacoesJsonbInserir),
           linha_nome: linhaOicial,
           artigo_nome: artigoOficial,
           cor_nome: corOficial,
           codigo_unico: codigoUnicoSingle || null,
           resumo_linha_artigo_cor: bodyData.resumo_linha_artigo_cor || null,
           acabamentos: toJson(acabamentosJsonbInserir),
           personalizacoes: toJson(personalizacoesJsonbInserir),
           custo_personalizacao: custoPersonalizacaoInserir,
           itens_adicionais: toJson(bodyData.itens_adicionais || []),
           operacoes: toJson(bodyData.operacoes || []),
           produto_percentual: produtoPercentual,
           servico_percentual: servicoPercentual,
         });
      }

      // Calcula TTE para índice 1 (item principal)
      const empIdInserir = empresa_id || bodyData.empresa_id;
      const somaCoresInserir = calcularSomaCores(personalizacoesJsonbInserir);
      const somaPosicoesInserir = calcularSomaPosicoes(personalizacoesJsonbInserir);
      const tempoPersonalizacaoInserir = await calcularTTE(quantidade, somaCoresInserir, somaPosicoesInserir, empIdInserir);
      // Sempre grava tempo_personalizacao no indice 1: valor calculado ou 0 se não há personalização
      for (const reg of registrosInserir) {
        if ((reg.indice || 1) === 1) reg.tempo_personalizacao = tempoPersonalizacaoInserir ?? 0;
      }

      // Tenta inserir todos os registros
      let { data, error } = await supabase.from('orcamento_itens').insert(registrosInserir).select();

      if (error) {
        console.error('[orcamentoItensCRUD] inserir erro:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
      }

      // Após inserção bem-sucedida, invoca fn_recalcular_item para cada registro inserido (apenas índice 1)
      const dadosRecalculados = [];
      if (Array.isArray(data)) {
        for (const item of data) {
          // Executa a função SQL apenas para índice 1 ou não especificado
          if ((item.indice || 1) === 1) {
            try {
              // Chama a função SQL para recalcular
              const { data: recalc, error: errRecalc } = await supabase
                .rpc('fn_recalcular_item', { p_id: item.id });
              
              if (errRecalc) {
                console.warn(`[orcamentoItensCRUD] Erro ao recalcular item ${item.id}:`, errRecalc.message);
              } else {
                console.log(`[orcamentoItensCRUD] Item ${item.id} recalculado com sucesso`);
              }
            } catch (e) {
              console.warn(`[orcamentoItensCRUD] Exceção ao recalcular item ${item.id}:`, e.message);
            }
          }
          dadosRecalculados.push(item);
        }
      }

      // Refaz SELECT para trazer os valores recalculados
      const idsInseridos = (Array.isArray(data) ? data : [data]).map(d => d.id);
      const { data: dadosAtualizados } = await supabase
        .from('orcamento_itens')
        .select('*')
        .in('id', idsInseridos);

      return Response.json({ data: Array.isArray(dadosAtualizados) ? dadosAtualizados : [dadosAtualizados] });
    }

    // ─── ATUALIZAR ────────────────────────────────────────────────────────────
    if (action === 'atualizar') {
      if (!id || !bodyData) return Response.json({ error: '"id" e "data" são obrigatórios' }, { status: 400 });

      const toJson = (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null;
      const valorUnitario = parseFloat(bodyData.valor_unitario || 0);
      const quantidade = parseInt(bodyData.quantidade || 1);
      const subtotal = valorUnitario * quantidade;
      const produtoPercentual = parseFloat(bodyData.produto_percentual ?? 100);
      const servicoPercentual = parseFloat(bodyData.servico_percentual ?? 0);
      const orcamentoId = bodyData.orcamento_id || null;
      const sequencia = parseInt(bodyData.sequencia || 1);

      // ── CUSTO_UN: busca custo_un da tabela_precos_sync (ADITIVO, não sobrescreve se já existe)
      let custoUnAtualizar = (bodyData.custo_un !== null && bodyData.custo_un !== undefined) ? bodyData.custo_un : null;
      if (bodyData.produto_id && custoUnAtualizar === null) {
        const { data: custoRowsUpd } = await supabase
          .from('tabela_precos_sync')
          .select('custo_un')
          .eq('produto_id', bodyData.produto_id)
          .is('deleted_at', null)
          .limit(1);
        if (custoRowsUpd && custoRowsUpd.length > 0) custoUnAtualizar = custoRowsUpd[0].custo_un ?? null;
      }

      // ── ACABAMENTOS: busca no backend e monta JSONB {id, descricao, valor}
      const acabamentosIdsAtualizar = Array.isArray(bodyData.acabamentos_ids) ? bodyData.acabamentos_ids : [];
      const { jsonb: acabamentosJsonbAtualizar, custo: custoAcabamentoAtualizar } = await buscarAcabamentosJsonb(acabamentosIdsAtualizar, empresa_id || bodyData.empresa_id);

      // ── PERSONALIZAÇÕES: monta JSONB com cálculo backend
      const { jsonb: personalizacoesJsonbAtualizar, custo: custoPersonalizacaoAtualizar } = await montarPersonalizacoesJsonb(
        Array.isArray(bodyData.personalizacoes_payload) ? bodyData.personalizacoes_payload : [],
        empresa_id || bodyData.empresa_id
      );

      // Determina se é produto composto (codigo_unico é JSON com múltiplos índices)
      let tecidosSelecionados = {};
      try {
        if (bodyData.codigo_unico && String(bodyData.codigo_unico).startsWith('{')) {
          tecidosSelecionados = JSON.parse(bodyData.codigo_unico);
        } else if (bodyData.codigo_unico) {
          tecidosSelecionados = { 1: bodyData.codigo_unico };
        }
      } catch (e) {
        tecidosSelecionados = bodyData.codigo_unico ? { 1: bodyData.codigo_unico } : {};
      }

      const isComposto = Object.keys(tecidosSelecionados).length > 1;
      // orcamento_id pode vir tanto do bodyData quanto do nível raiz do body
      const orcamentoIdFinal = orcamentoId || bodyData.orcamento_id || null;

      if (isComposto) {
        // Produto composto: monta mapa de indice → id usando grupo_ids (passados pelo frontend)
        const existentesPorIndice = {};
        const grupoIds = bodyData.grupo_ids || [];
        for (const reg of grupoIds) {
          if (reg.indice && reg.id) existentesPorIndice[reg.indice] = reg.id;
        }
        // Fallback: se não veio grupo_ids, busca pelo id principal (índice 1)
        if (Object.keys(existentesPorIndice).length === 0 && id) {
          existentesPorIndice[1] = id;
        }

        // Busca metadados (linha, cor, artigo, custo_un) de cada tecido pelo id específico
        const metaPorIndice = {};
        const custoUnPorIndiceUpd = {};
        for (const [indice, tecidoId] of Object.entries(tecidosSelecionados)) {
          const { data: tdRow } = await supabase.from('tabela_precos_sync').select('linha_nome, cor_nome, artigo_nome, custo_un').eq('id', tecidoId).maybeSingle();
          if (tdRow) {
            metaPorIndice[indice] = { linha_nome: tdRow.linha_nome || null, cor_nome: tdRow.cor_nome || null, artigo_nome: tdRow.artigo_nome || null };
            custoUnPorIndiceUpd[indice] = tdRow.custo_un ?? null;
          }
        }

        // Calcula TTE para o item composto
        const empIdUpd = empresa_id || bodyData.empresa_id;
        const somaCoresUpd = calcularSomaCores(personalizacoesJsonbAtualizar);
        const somaPosicoesUpd = calcularSomaPosicoes(personalizacoesJsonbAtualizar);
        const tempoPersonalizacaoUpd = await calcularTTE(quantidade, somaCoresUpd, somaPosicoesUpd, empIdUpd);

        // Atualiza ou insere cada índice
        const resultados = [];
        for (const indice of Object.keys(tecidosSelecionados).sort((a, b) => Number(a) - Number(b))) {
          const meta = metaPorIndice[indice] || {};
          // REGRA: custo_acabamento somente no índice 1; custo_un usa o valor específico do tecido de cada índice
          const custoAcabIndicUpd = parseInt(indice) === 1 ? custoAcabamentoAtualizar : 0;
          const custoUnIndicUpd = custoUnPorIndiceUpd[indice] ?? 0;
          const somaIndicUpd = parseInt(indice) === 1 ? calcularSomaAcabItens(acabamentosJsonbAtualizar, bodyData.itens_adicionais || []) : 0;
          const somaItensAdicIndicUpd = parseInt(indice) === 1 ? calcularSomaItensAdicionais(bodyData.itens_adicionais || []) : 0;
          const rowPayload = {
            sequencia,
            indice: parseInt(indice),
            tipo_item: bodyData.tipo_item || 'Produto',
            produto_id: bodyData.produto_id || null,
            nome_produto: bodyData.nome_produto || null,
            quantidade,
            valor_unitario: valorUnitario,
            subtotal,
            ...(custoUnIndicUpd !== null ? { custo_un: custoUnIndicUpd } : {}),
            custo_acabamento: custoAcabIndicUpd,
            soma_acab_itens: somaIndicUpd,
            soma_itens_adicionais: somaItensAdicIndicUpd,
            soma_posicoes: parseInt(indice) === 1 ? somaPosicoesUpd : 0,
            soma_cores: parseInt(indice) === 1 ? somaCoresUpd : 0,
            ...(parseInt(indice) === 1 ? { tempo_personalizacao: tempoPersonalizacaoUpd ?? 0 } : {}),
            linha_nome: meta.linha_nome,
            artigo_nome: meta.artigo_nome,
            cor_nome: meta.cor_nome,
            codigo_unico: tecidosSelecionados[indice],
            resumo_linha_artigo_cor: bodyData.resumo_linha_artigo_cor || null,
            acabamentos: toJson(acabamentosJsonbAtualizar),
            personalizacoes: toJson(personalizacoesJsonbAtualizar),
            custo_personalizacao: parseInt(indice) === 1 ? custoPersonalizacaoAtualizar : 0,
            itens_adicionais: toJson(bodyData.itens_adicionais || []),
            operacoes: toJson(bodyData.operacoes || []),
            produto_percentual: produtoPercentual,
            servico_percentual: servicoPercentual,
            updated_at: new Date().toISOString(),
          };

          if (existentesPorIndice[indice]) {
            // Atualiza registro existente
            const { data: upd, error: upErr } = await supabase.from('orcamento_itens').update(rowPayload).eq('id', existentesPorIndice[indice]).select().single();
            if (!upErr && upd) resultados.push(upd);
          } else {
            // Insere novo registro (índice novo adicionado)
            const { data: ins, error: insErr } = await supabase.from('orcamento_itens').insert({ ...rowPayload, orcamento_id: orcamentoIdFinal }).select().single();
            if (!insErr && ins) resultados.push(ins);
          }
        }

        return Response.json({ data: resultados[0] || null });
      }

      // Produto simples: atualiza o único registro pelo id
      let linhaOficial = null, corOficial = null, artigoOficial = null;
      const codigoUnicoSingle = tecidosSelecionados[1];
      if (codigoUnicoSingle) {
        const { data: tdRow2 } = await supabase.from('tabela_precos_sync').select('linha_nome, cor_nome, artigo_nome, custo_un').eq('id', codigoUnicoSingle).maybeSingle();
        if (tdRow2) {
          linhaOficial = tdRow2.linha_nome || null;
          corOficial = tdRow2.cor_nome || null;
          artigoOficial = tdRow2.artigo_nome || null;
          // Usa custo_un do tecido específico selecionado (sobrepõe busca genérica por produto_id)
          if (tdRow2.custo_un !== null && tdRow2.custo_un !== undefined) {
            custoUnAtualizar = tdRow2.custo_un;
          }
        }
      }

      // Calcula TTE para produto simples
      const empIdSimples = empresa_id || bodyData.empresa_id;
      const somaCoresSimples = calcularSomaCores(personalizacoesJsonbAtualizar);
      const somaPosicoesSimples = calcularSomaPosicoes(personalizacoesJsonbAtualizar);
      const tempoPersonalizacaoSimples = await calcularTTE(quantidade, somaCoresSimples, somaPosicoesSimples, empIdSimples);

      // Calcula valor_personalizacao (operacional) a partir das personalizacoes
      let valor_personalizacao = 0;
      if (Array.isArray(personalizacoesJsonbAtualizar) && personalizacoesJsonbAtualizar.length > 0) {
        valor_personalizacao = personalizacoesJsonbAtualizar.reduce((acc, p) => acc + (Number(p?.valor) || 0), 0);
      }

      const updateCompleto = {
        sequencia,
        tipo_item: bodyData.tipo_item || 'Produto',
        produto_id: bodyData.produto_id || null,
        nome_produto: bodyData.nome_produto || null,
        quantidade,
        valor_unitario: valorUnitario,
        subtotal,
        ...(custoUnAtualizar !== null ? { custo_un: custoUnAtualizar } : {}),
        custo_acabamento: custoAcabamentoAtualizar,
        soma_acab_itens: calcularSomaAcabItens(acabamentosJsonbAtualizar, bodyData.itens_adicionais || []),
        soma_itens_adicionais: calcularSomaItensAdicionais(bodyData.itens_adicionais || []),
        soma_posicoes: somaPosicoesSimples,
        soma_cores: somaCoresSimples,
        tempo_personalizacao: tempoPersonalizacaoSimples ?? 0,
        produto_percentual: produtoPercentual,
        servico_percentual: servicoPercentual,
        linha_nome: linhaOficial,
        artigo_nome: artigoOficial,
        cor_nome: corOficial,
        codigo_unico: codigoUnicoSingle || null,
        resumo_linha_artigo_cor: bodyData.resumo_linha_artigo_cor || null,
        acabamentos: toJson(acabamentosJsonbAtualizar),
        personalizacoes: toJson(personalizacoesJsonbAtualizar),
        valor_personalizacao: valor_personalizacao,
        custo_personalizacao: custoPersonalizacaoAtualizar,
        itens_adicionais: toJson(bodyData.itens_adicionais),
        operacoes: toJson(bodyData.operacoes),
        updated_at: new Date().toISOString(),
      };

      let updateResult = await supabase.from('orcamento_itens').update(updateCompleto).eq('id', id).select();
      if (updateResult.error) {
        // Fallback: payload mínimo
        const updateMinimo = { produto_id: bodyData.produto_id || null, quantidade, valor_unitario: valorUnitario, subtotal, produto_percentual: produtoPercentual, servico_percentual: servicoPercentual, updated_at: new Date().toISOString() };
        updateResult = await supabase.from('orcamento_itens').update(updateMinimo).eq('id', id).select();
      }

      if (updateResult.error) return Response.json({ error: updateResult.error.message }, { status: 500 });
      
      // Após atualização bem-sucedida, invoca fn_recalcular_item (apenas para índice 1)
      const itemAtualizado = Array.isArray(updateResult.data) ? updateResult.data[0] : updateResult.data;
      if ((itemAtualizado?.indice || 1) === 1) {
        try {
          // Chama a função SQL para recalcular
          const { error: errRecalc } = await supabase
            .rpc('fn_recalcular_item', { p_id: id });
          
          if (errRecalc) {
            console.warn(`[orcamentoItensCRUD] Erro ao recalcular item ${id}:`, errRecalc.message);
          } else {
            console.log(`[orcamentoItensCRUD] Item ${id} recalculado com sucesso após UPDATE`);
          }
        } catch (e) {
          console.warn(`[orcamentoItensCRUD] Exceção ao recalcular item ${id}:`, e.message);
        }
      }

      // Refaz SELECT para trazer os valores recalculados pela função SQL
      const { data: dadosRecalculados } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('id', id)
        .single();

      const base2 = dadosRecalculados || itemAtualizado;
      return Response.json({ data: { ...base2, acabamentos: acabamentosJsonbAtualizar, personalizacoes: personalizacoesJsonbAtualizar, operacoes: bodyData.operacoes || [], itens_adicionais: bodyData.itens_adicionais || [] } });
    }

    // ─── EXCLUIR (soft delete) ────────────────────────────────────────────────
    if (action === 'excluir') {
      if (!id) return Response.json({ error: '"id" é obrigatório' }, { status: 400 });
      const { error } = await supabase
        .from('orcamento_itens')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true });
    }

    // ─── AUXILIARES ──────────────────────────────────────────────────────────

    // Produtos comerciais
    if (action === 'listar_produtos') {
      const { data, error } = await supabase
        .from('produto_comercial')
        .select('id, nome_produto')
        .order('nome_produto', { ascending: true })
        .limit(300);
      if (error) return Response.json({ data: [] });
      return Response.json({ data: data || [] });
    }

    // Vínculos tecido — busca de config_vinculos (codigo_unico, linha_comercial_nome, cor_nome_comercial)
    if (action === 'listar_vinculos_tecido') {
      const { data, error } = await supabase
        .from('config_vinculos')
        .select('codigo_unico, linha_nome, cor_nome')
        .is('deleted_at', null)
        .order('linha_nome', { ascending: true })
        .limit(500);

      if (error) {
        // fallback: tenta config_tecido_vinculos
        const { data: vinculos, error: evinculos } = await supabase
          .from('config_tecido_vinculos')
          .select('id, codigo_unico, linha_comercial_id, cor_tecido_id');
        if (evinculos) return Response.json({ data: [] });

        const [{ data: linhas }, { data: cores }] = await Promise.all([
          supabase.from('config_tecido_linha_comercial').select('id, linha_nome'),
          supabase.from('config_tecido_cor').select('id, cor_nome'),
        ]);

        const linhaMap = Object.fromEntries((linhas || []).map(l => [l.id, l.linha_nome]));
        const corMap = Object.fromEntries((cores || []).map(c => [c.id, c.cor_nome]));

        return Response.json({ data: (vinculos || []).map(v => ({
          codigo_unico: v.codigo_unico,
          nome_linha_comercial: linhaMap[v.linha_comercial_id] || '',
          nome_cor: corMap[v.cor_tecido_id] || '',
          label: `${linhaMap[v.linha_comercial_id] || ''} - ${corMap[v.cor_tecido_id] || ''}`,
        })) });
      }

      return Response.json({ data: (data || []).map(v => ({
        codigo_unico: v.codigo_unico,
        nome_linha_comercial: v.linha_nome || '',
        nome_cor: v.cor_nome || '',
        label: `${v.linha_nome || ''} - ${v.cor_nome || ''}`,
      })) });
    }

    // Acabamentos — apenas registros válidos (deleted_at IS NULL) filtrados por empresa
    if (action === 'listar_acabamentos') {
      let q = supabase
        .from('config_acabamentos')
        .select('id, nome_acabamento, valor_acab_un')
        .is('deleted_at', null)
        .order('nome_acabamento', { ascending: true });
      if (empresa_id) q = q.eq('empresa_id', empresa_id);
      const { data, error } = await q;
      if (error) return Response.json({ data: [] });
      return Response.json({ data: data || [] });
    }

    // Personalizações — apenas registros válidos (deleted_at IS NULL) filtrados por empresa
    if (action === 'listar_personalizacoes') {
      let q = supabase
        .from('config_personalizacao')
        .select('id, tipo_personalizacao, dependencias_pers, valor_pers_un')
        .is('deleted_at', null)
        .order('tipo_personalizacao', { ascending: true });
      if (empresa_id) q = q.eq('empresa_id', empresa_id);
      const { data, error } = await q;
      if (error) return Response.json({ data: [] });
      return Response.json({ data: data || [] });
    }

    // Itens adicionais (config_dependencias) — apenas registros válidos (deleted_at IS NULL)
    if (action === 'listar_itens_adicionais') {
      let q = supabase
        .from('config_dependencias')
        .select('id, tipo_dependencia, valor_adicional')
        .is('deleted_at', null)
        .order('tipo_dependencia', { ascending: true });
      if (empresa_id) q = q.eq('empresa_id', empresa_id);
      const { data, error } = await q;
      if (error) return Response.json({ data: [] });
      return Response.json({ data: data || [] });
    }

    // Dependências / operações (mantido por compatibilidade)
    if (action === 'listar_dependencias') {
      let q = supabase
        .from('config_dependencias')
        .select('id, tipo_dependencia')
        .is('deleted_at', null)
        .order('tipo_dependencia', { ascending: true });
      if (empresa_id) q = q.eq('empresa_id', empresa_id);
      const { data, error } = await q;
      if (error) return Response.json({ data: [] });
      return Response.json({ data: data || [] });
    }

    // buscarProdutos — busca direto da tabela_precos_sync (sem filtro deleted_at pois coluna pode não existir)
    if (action === 'buscarProdutos') {
      const { data: tps, error: etps } = await supabase
        .from('tabela_precos_sync')
        .select('produto_id, nome_produto, codigo_produto');
      if (!etps && tps && tps.length > 0) {
        const seen = new Set();
        const uniq = [];
        for (const row of tps) {
          if (row.produto_id && !seen.has(row.produto_id)) {
            seen.add(row.produto_id);
            uniq.push({ produto_id: row.produto_id, nome_produto: row.nome_produto || '', codigo_produto: row.codigo_produto || '' });
          }
        }
        uniq.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));
        return Response.json({ data: uniq });
      }
      // Fallback: produto_comercial
      const { data: pc } = await supabase
        .from('produto_comercial')
        .select('id, nome_produto, codigo')
        .order('nome_produto', { ascending: true })
        .limit(300);
      return Response.json({ data: (pc || []).map(p => ({ produto_id: p.id, nome_produto: p.nome_produto || '', codigo_produto: p.codigo || '' })) });
    }

    // buscarEstruturaProduto — retorna tipo_produto + tecidos organizados por índice
    if (action === 'buscarEstruturaProduto' || action === 'buscarTecidos') {
      const pid = body.produto_id;
      if (!pid) return Response.json({ data: { tipo_produto: 'simples', tecidos: {} } });

      const query = supabase
        .from('tabela_precos_sync')
        .select('id, codigo_unico, artigo_nome, tipo_produto, indice, resumo_composicoes, cor_nome, linha_nome')
        .eq('produto_id', pid)
        .order('indice', { ascending: true });

      // Filtra por empresa_id se fornecido
      if (body.empresa_id) query.eq('empresa_id', body.empresa_id);

      const { data, error } = await query;

      if (error) {
        console.error('[buscarEstruturaProduto] erro:', error.message);
        return Response.json({ data: { tipo_produto: 'simples', tecidos: {} }, error: error.message });
      }

      if (!data || data.length === 0) {
        return Response.json({ data: { tipo_produto: 'simples', tecidos: {} } });
      }

      const tipo_produto = data[0]?.tipo_produto || 'simples';
      const tecidosPorIndice = {};

      for (const item of data) {
        const idx = item.indice || 1;
        if (!tecidosPorIndice[idx]) {
          tecidosPorIndice[idx] = { resumo: item.resumo_composicoes || '', opcoes: [] };
        }
        tecidosPorIndice[idx].opcoes.push({ id: item.id, codigo_unico: item.codigo_unico || '', artigo_nome: item.artigo_nome || '', cor_nome: item.cor_nome || '', linha_nome: item.linha_nome || '' });
      }

      return Response.json({ data: { tipo_produto, tecidos: tecidosPorIndice } });
    }

    // verificarEstampariaVinculada — verifica se um parâmetro de estamparia está em uso nos orcamento_itens
    if (action === 'verificarEstampariaVinculada') {
      const estamparia_id = body.estamparia_id;
      const emp_id = empresa_id || body.empresa_id;
      if (!estamparia_id) return Response.json({ vinculado: false });

      // Busca itens de orçamento ativos da empresa
      let q = supabase
        .from('orcamento_itens')
        .select('id, personalizacoes, acabamentos, itens_adicionais')
        .is('deleted_at', null);
      if (emp_id) q = q.eq('empresa_id', emp_id);
      const { data: itens } = await q.limit(2000);

      const parseJsonb = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
        return [];
      };

      let vinculado = false;
      const idStr = String(estamparia_id);

      for (const item of (itens || [])) {
        const pers = parseJsonb(item.personalizacoes);
        const acab = parseJsonb(item.acabamentos);
        const adicionais = parseJsonb(item.itens_adicionais);

        const emPers = pers.some(p => String(p?.id) === idStr);
        const emAcab = acab.some(a => String(a?.id) === idStr);
        const emAdic = adicionais.some(a => String(a?.id) === idStr);

        if (emPers || emAcab || emAdic) {
          vinculado = true;
          break;
        }
      }

      return Response.json({ vinculado });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('[orcamentoItensCRUD] ERRO CAPTURADO:', error.message, error.stack);
    return Response.json({ error: error.message, details: error.stack }, { status: 500 });
  }
});