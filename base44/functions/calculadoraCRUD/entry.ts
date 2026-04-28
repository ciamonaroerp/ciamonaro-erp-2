import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

async function registrarLog(empresa_id, evento, detalhes = {}) {
  try {
    await supabase.from('audit_log').insert({
      empresa_id,
      acao: evento,
      entidade: 'calculadora',
      dados_novos: JSON.stringify(detalhes),
      data_evento: new Date().toISOString(),
    });
  } catch (_) { /* silencia erro de log */ }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, data: [], error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { action, empresa_id } = body;

    // ── CARREGAR MODELOS ──────────────────────────────────────────────────────
    if (action === 'carregar_modelos') {
      try {
        const { data, error } = await supabase
          .from('tabela_precos_sync')
          .select('codigo_produto, nome_produto')
          .is('deleted_at', null)
          .order('nome_produto', { ascending: true });

        if (error) throw new Error(error.message);

        // Remove duplicatas por codigo_produto + nome_produto
        const vistos = new Set();
        const unicos = (data || []).filter(row => {
          const chave = `${row.codigo_produto}|${row.nome_produto}`;
          if (vistos.has(chave)) return false;
          vistos.add(chave);
          return true;
        });

        await registrarLog(empresa_id, 'LOAD_MODELOS', { total: unicos.length });
        return Response.json({ success: true, data: unicos, error: null });
      } catch (error) {
        console.error('Erro carregar_modelos:', error);
        return Response.json({ success: false, data: [], error: error.message });
      }
    }

    // ── CARREGAR ARTIGOS POR MODELO ───────────────────────────────────────────
    if (action === 'carregar_artigos_por_modelo') {
      try {
        const { modelo_codigo } = body;
        if (!modelo_codigo) return Response.json({ success: true, data: [], error: null });

        const { data, error } = await supabase
          .from('tabela_precos_sync')
          .select('descricao_artigo, custo_un')
          .eq('codigo_produto', modelo_codigo)
          .is('deleted_at', null)
          .order('descricao_artigo', { ascending: true });

        if (error) throw new Error(error.message);

        // Remove duplicatas — mantém o primeiro custo_un encontrado
        const vistos = new Set();
        const unicos = (data || []).filter(row => {
          if (!row.descricao_artigo) return false;
          if (vistos.has(row.descricao_artigo)) return false;
          vistos.add(row.descricao_artigo);
          return true;
        });

        await registrarLog(empresa_id, 'LOAD_ARTIGOS', { modelo_codigo, total: unicos.length });
        return Response.json({ success: true, data: unicos, error: null });
      } catch (error) {
        console.error('Erro carregar_artigos_por_modelo:', error);
        return Response.json({ success: false, data: [], error: error.message });
      }
    }

    // ── CARREGAR VALOR DO ARTIGO ──────────────────────────────────────────────
    if (action === 'carregar_valor_artigo') {
      try {
        const { codigo_produto, descricao_artigo } = body;
        if (!codigo_produto || !descricao_artigo) {
          return Response.json({ success: true, data: [{ descricao: descricao_artigo, valor: 0 }], error: null });
        }

        const { data, error } = await supabase
          .from('tabela_precos_sync')
          .select('descricao_artigo, custo_un')
          .eq('codigo_produto', codigo_produto)
          .eq('descricao_artigo', descricao_artigo)
          .is('deleted_at', null)
          .limit(1);

        if (error) throw new Error(error.message);

        const row = (data || [])[0];
        return Response.json({
          success: true,
          data: [{ descricao: row?.descricao_artigo ?? descricao_artigo, valor: row?.custo_un ?? 0 }],
          error: null,
        });
      } catch (error) {
        console.error('Erro carregar_valor_artigo:', error);
        return Response.json({ success: false, data: [{ descricao: '', valor: 0 }], error: error.message });
      }
    }

    // ── CARREGAR COMPOSICOES MODELO ─────────────────────────────────────────
    if (action === 'carregar_composicoes_modelo') {
      try {
        const { modelo_codigo } = body;
        if (!modelo_codigo) return Response.json({ success: true, data: [], error: null });

        // Busca um registro representativo do modelo para ler num_composicoes, composicoes e resumo_composicoes
        const { data: rows, error } = await supabase
          .from('tabela_precos_sync')
          .select('num_composicoes, composicoes, resumo_composicoes')
          .eq('codigo_produto', modelo_codigo)
          .is('deleted_at', null)
          .not('num_composicoes', 'is', null)
          .limit(1);

        if (error) throw new Error(error.message);

        const row = (rows || [])[0];

        // Modelo simples ou sem dados
        if (!row || !row.num_composicoes || row.num_composicoes <= 1) {
          return Response.json({ success: true, data: [], error: null });
        }

        // Interpreta JSON de composicoes NO BACKEND
        let composicoesRaw = [];
        try {
          composicoesRaw = typeof row.composicoes === 'string'
            ? JSON.parse(row.composicoes)
            : (row.composicoes || []);
        } catch (_) {
          // JSON inválido — retorna vazio (modelo simples)
          return Response.json({ success: true, data: [], error: null });
        }

        if (!Array.isArray(composicoesRaw) || composicoesRaw.length === 0) {
          return Response.json({ success: true, data: [], error: null });
        }

        // Interpreta resumo_composicoes (pode ser array JSON ou string)
        let resumoArr = [];
        try {
          const raw = row.resumo_composicoes;
          if (Array.isArray(raw)) resumoArr = raw;
          else if (typeof raw === 'string') resumoArr = JSON.parse(raw);
        } catch (_) { resumoArr = []; }

        // Normaliza para contrato padrão — retorna { composicao, nome, partes }
        // Estrutura real do JSON: { indice: 1, itens: [{nome: "Gola"}, ...], valor_total: 0 }
        const composicoes = composicoesRaw
          .map((c, idx) => {
            const indice = Number(c.indice ?? c.composicao ?? idx + 1);
            const partes = Array.isArray(c.itens)
              ? c.itens.map(i => i.nome).filter(Boolean)
              : [];
            const nome = resumoArr[indice - 1] || `Composição ${indice}`;
            return { composicao: indice, nome, partes };
          })
          .sort((a, b) => a.composicao - b.composicao);

        // Validação de consistência
        if (row.num_composicoes > 0 && composicoes.length !== row.num_composicoes) {
          console.warn('Inconsistência num_composicoes vs JSON', { num_composicoes: row.num_composicoes, total_json: composicoes.length });
        }

        await registrarLog(empresa_id, 'LOAD_COMPOSICOES', { modelo_codigo, total: composicoes.length });
        return Response.json({ success: true, data: composicoes, error: null });
      } catch (error) {
        console.error('Erro carregar_composicoes_modelo:', error);
        return Response.json({ success: false, data: [], error: error.message });
      }
    }

    // ── CARREGAR ACABAMENTOS ──────────────────────────────────────────────────
    if (action === 'carregar_acabamentos') {
      try {
        const { data, error } = await supabase
          .from('config_acabamentos')
          .select('id, nome_acabamento, valor_acab_un')
          .is('deleted_at', null)
          .order('nome_acabamento', { ascending: true });

        if (error) throw new Error(error.message);

        await registrarLog(empresa_id, 'LOAD_ACABAMENTOS', { total: (data || []).length });
        return Response.json({ success: true, data: data || [], error: null });
      } catch (error) {
        console.error('Erro carregar_acabamentos:', error);
        return Response.json({ success: false, data: [], error: error.message });
      }
    }

    // ── CARREGAR PERSONALIZACOES ──────────────────────────────────────────────
    if (action === 'carregar_personalizacoes') {
      try {
        // Seleciona colunas booleanas diretamente (salvas pela ConfiguracaoExtrasPage)
        const { data, error } = await supabase
          .from('config_personalizacao')
          .select('id, tipo_personalizacao, valor_pers_un, usa_valor_unitario, usa_posicoes, usa_cores, dependencias_pers')
          .is('deleted_at', null)
          .order('tipo_personalizacao', { ascending: true });

        if (error) throw new Error(error.message);

        const processado = (data || []).map(row => {
          // Usa as colunas booleanas diretas; fallback para dependencias_pers se não existirem
          let usa_valor_unitario = !!row.usa_valor_unitario;
          let usa_posicoes = !!row.usa_posicoes;
          let usa_cores = !!row.usa_cores;

          // Fallback: tenta extrair de dependencias_pers (pode ser objeto ou array)
          if (!usa_valor_unitario && !usa_posicoes && !usa_cores && row.dependencias_pers) {
            const dp = row.dependencias_pers;
            if (Array.isArray(dp)) {
              usa_valor_unitario = dp.some(d => ['valor_unitario', 'valor unitário', 'valor'].includes(String(d).toLowerCase().trim()));
              usa_posicoes = dp.some(d => ['posicoes', 'posições'].includes(String(d).toLowerCase().trim()));
              usa_cores = dp.some(d => ['cores', 'cor'].includes(String(d).toLowerCase().trim()));
            } else if (typeof dp === 'object') {
              // Salvo como objeto {usa_valor_unitario: true, ...}
              usa_valor_unitario = !!dp.usa_valor_unitario;
              usa_posicoes = !!dp.usa_posicoes;
              usa_cores = !!dp.usa_cores;
            }
          }

          return {
            id: row.id,
            tipo_personalizacao: row.tipo_personalizacao,
            valor_pers_un: row.valor_pers_un,
            usa_valor_unitario,
            usa_posicoes,
            usa_cores,
          };
        });

        await registrarLog(empresa_id, 'LOAD_PERSONALIZACOES', { total: processado.length });
        return Response.json({ success: true, data: processado, error: null });
      } catch (error) {
        console.error('Erro carregar_personalizacoes:', error);
        return Response.json({ success: false, data: [], error: error.message });
      }
    }

    // ── CARREGAR DEPENDENCIAS ─────────────────────────────────────────────────
    if (action === 'carregar_dependencias') {
      try {
        const { tipos_personalizacao = [] } = body;
        if (!tipos_personalizacao.length) {
          return Response.json({ success: true, data: [], error: null });
        }

        const { data, error } = await supabase
          .from('config_dependencias')
          .select('*')
          .in('tipo_personalizacao', tipos_personalizacao)
          .is('deleted_at', null)
          .order('tipo_personalizacao', { ascending: true });

        if (error) throw new Error(error.message);

        await registrarLog(empresa_id, 'LOAD_DEPENDENCIAS', { tipos: tipos_personalizacao, total: (data || []).length });
        return Response.json({ success: true, data: data || [], error: null });
      } catch (error) {
        console.error('Erro carregar_dependencias:', error);
        return Response.json({ success: false, data: [], error: error.message });
      }
    }

    // ── CALCULAR VALOR UNITARIO ───────────────────────────────────────────────
    if (action === 'calcular_valor_unitario') {
      try {
        // Placeholder - estrutura pronta para implementação futura
        const { quantidade, estado, cliente_ie, forma_pagamento, modelo_codigo, artigo, acabamentos, personalizacoes } = body;
        console.log('Calcular valor unitário - params recebidos:', { quantidade, estado, cliente_ie, forma_pagamento, modelo_codigo, artigo, acabamentos, personalizacoes });
        return Response.json({ success: true, data: { valor_unitario: 0 }, error: null });
      } catch (error) {
        console.error('Erro calcular_valor_unitario:', error);
        return Response.json({ success: false, data: { valor_unitario: 0 }, error: error.message });
      }
    }

    // ── SALVAR CONFIGURACAO ───────────────────────────────────────────────────
    if (action === 'salvar_configuracao') {
      try {
        const { id, quantidade, estado, cliente_ie, forma_pagamento, modelo_codigo, modelo_nome, artigo, acabamentos, personalizacoes, valor_unitario } = body;

        const payload = {
          empresa_id,
          quantidade: parseInt(quantidade) || 0,
          estado: estado || null,
          cliente_ie: !!cliente_ie,
          forma_pagamento: forma_pagamento || null,
          modelo_codigo: modelo_codigo || null,
          modelo_nome: modelo_nome || null,
          artigo: artigo || null,
          acabamentos: acabamentos || [],
          personalizacoes: personalizacoes || [],
          valor_unitario: parseFloat(valor_unitario) || 0,
          updated_at: new Date().toISOString(),
        };

        let result;
        if (id) {
          const { data, error } = await supabase.from('calculadora_configuracoes').update(payload).eq('id', id).select().single();
          if (error) throw new Error(error.message);
          result = data;
        } else {
          const { data, error } = await supabase.from('calculadora_configuracoes').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
          if (error) throw new Error(error.message);
          result = data;
        }

        return Response.json({ success: true, data: result, error: null });
      } catch (error) {
        console.error('Erro salvar_configuracao:', error);
        return Response.json({ success: false, data: null, error: error.message });
      }
    }

    return Response.json({ success: false, data: [], error: `Ação desconhecida: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('Erro geral calculadoraCRUD:', error);
    return Response.json({ success: false, data: [], error: error.message }, { status: 500 });
  }
});