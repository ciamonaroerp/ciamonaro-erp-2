import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Lê tempo já em minutos (inteiro)
function tempoParaMinutos(tempo) {
  if (tempo === null || tempo === undefined || tempo === '') return null;
  const num = Number(tempo);
  return isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { item_id, empresa_id, quantidade, soma_cores, soma_posicoes } = body;

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // ===============================
    // 1. RESOLVER DADOS DO ITEM
    // ===============================
    let qtd = Number(quantidade) || 0;
    let cores = Number(soma_cores) || 0;
    let posicoes = Number(soma_posicoes) || 0;

    if (qtd <= 0 || cores <= 0 || posicoes <= 0) {
      return Response.json({
        ok: true,
        dados_insuficientes: true,
        message: 'Informe quantidade, cores e posições para calcular',
      });
    }

    // ===============================
    // 2. BUSCAR CONFIG ESTAMPARIA (em paralelo com item se necessário)
    // ===============================
    const REQUIRED = ['PRM01', 'PRM02', 'PRM03', 'PRM04', 'PRM05', 'PRM06', 'PRM07', 'PRM08'];

    const needsItem = item_id && (qtd <= 0 || cores <= 0 || posicoes <= 0);

    let paramsQuery = supabase
      .from('config_estamparia')
      .select('codigo, unidade, tempo, tipo_parametro')
      .in('codigo', REQUIRED)
      .is('deleted_at', null);

    if (empresa_id) paramsQuery = paramsQuery.eq('empresa_id', empresa_id);

    const itemQuery = needsItem
      ? supabase.from('orcamento_itens').select('quantidade, soma_cores, soma_posicoes').eq('id', item_id).single()
      : Promise.resolve({ data: null, error: null });

    const [{ data: params, error: paramErr }, { data: itemData, error: itemErr }] = await Promise.all([paramsQuery, itemQuery]);

    if (paramErr) {
      return Response.json({ success: false, data: [], error: paramErr.message });
    }

    if (needsItem) {
      if (itemErr || !itemData) {
        return Response.json({ success: false, data: [], error: 'Item não encontrado' });
      }
      qtd = Number(itemData.quantidade) || 0;
      cores = Number(itemData.soma_cores) || 0;
      posicoes = Number(itemData.soma_posicoes) || 0;
    }

    const get = (codigo) => (params || []).find(c => c.codigo === codigo);

    // ===============================
    // 3. VALIDAÇÃO OBRIGATÓRIA
    // ===============================
    const faltando = REQUIRED.filter(code => !get(code));
    if (faltando.length > 0) {
      return Response.json({
        ok: true,
        dados_insuficientes: true,
        message: `Parâmetros de estamparia não configurados: ${faltando.join(', ')}. Acesse Configuração Extras → Parâmetros estamparia.`,
      });
    }

    // PRM01: média de prints por camiseta (unidade)
    const prm01       = Number(get('PRM01').unidade);
    // PRM02 e PRM03: lidos da coluna "unidade" (número inteiro)
    const prints_hora = Number(get('PRM02').unidade);
    const maquinas    = Number(get('PRM03').unidade);

    if (prints_hora <= 0 || maquinas <= 0) {
      return Response.json({
        ok: true,
        dados_insuficientes: true,
        message: 'PRM02 (prints/hora) e PRM03 (máquinas) devem ser maiores que zero.',
      });
    }

    // PRM04–PRM08: lidos da coluna "tempo" no formato "HH:MM:SS" → convertidos para minutos
    const intervalo_limpeza = tempoParaMinutos(get('PRM04').tempo);
    const limpeza_impressao = tempoParaMinutos(get('PRM05').tempo);
    const limpeza_final     = tempoParaMinutos(get('PRM06').tempo);
    const setup_por_cor     = tempoParaMinutos(get('PRM07').tempo);
    const jornada           = tempoParaMinutos(get('PRM08').tempo);

    if (!jornada || jornada <= 0) {
      return Response.json({
        ok: true,
        dados_insuficientes: true,
        message: 'PRM08 (jornada) deve ser maior que zero.',
      });
    }

    // ===============================
    // 4. CÁLCULOS (MINUTOS) — lógica Excel
    // ===============================

    // TP = Total de prints: quantidade × soma_posicoes × PRM01
    const tp = qtd * posicoes * prm01;

    // TI = Tempo de impressão em minutos
    const ti = (tp / (prints_hora * maquinas)) * 60;

    // Setups: SE ti < jornada → cores; SENÃO → ceil(ti/jornada) * cores
    const setups = ti < jornada ? cores : Math.ceil(ti / jornada) * cores;

    // TS = Tempo total de setup
    const ts = setups * setup_por_cor;

    // NL = Número de limpezas: SE ti < intervalo_limpeza → 0; SENÃO → ceil(ti/intervalo_limpeza) * cores
    const nl = (intervalo_limpeza > 0 && ti >= intervalo_limpeza)
      ? Math.ceil(ti / intervalo_limpeza) * cores
      : 0;

    // TLI = Tempo limpeza de impressão
    const tli = nl * limpeza_impressao * cores;

    // TLF = Tempo limpeza final
    const tlf = limpeza_final * setups;

    // TTE = Tempo total estimado
    const tte = ti + ts + tli + tlf;

    // ===============================
    // 5. RETORNO
    // ===============================
    return Response.json({
      ok: true,
      resultado: { tp, setups, ti, ts, nl, tli, tlf, tte, jornada },
    });

  } catch (error) {
    return Response.json({ success: false, data: [], error: error.message }, { status: 500 });
  }
});