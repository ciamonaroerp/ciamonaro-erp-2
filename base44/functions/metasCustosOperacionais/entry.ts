import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CATEGORIAS_TERCEIROS = [
  'Corte', 'Confeccao interna', 'Confeccao externa',
  'Estamparia interna', 'Estamparia externa', 'Revisao', 'Embalagem', 'Logistica'
];

function supabaseAdmin() {
  return createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );
}

async function registrarLog(base44, acao, entidade, registro_id, dados_novos, dados_anteriores = null) {
  try {
    await base44.asServiceRole.entities.AuditLogs.create({
      acao,
      entidade,
      registro_id: String(registro_id),
      dados_novos: JSON.stringify(dados_novos),
      dados_anteriores: dados_anteriores ? JSON.stringify(dados_anteriores) : null,
      modulo: 'Metas e Custos Operacionais',
      data_evento: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Erro ao registrar log:', e);
  }
}

async function recalcularCustosFixos(sb, empresa_id) {
  const { data, error } = await sb
    .from('custos_fixos')
    .select('id, percentual, tipo')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);

  const diretos = data.filter(i => i.tipo === 'direto');
  const indiretos = data.filter(i => i.tipo === 'indireto');

  const totalDiretos = diretos.reduce((s, i) => s + Number(i.percentual), 0);
  const totalIndiretos = indiretos.reduce((s, i) => s + Number(i.percentual), 0);

  if (totalDiretos === 0) return;

  const fator = (totalDiretos + totalIndiretos) / totalDiretos;

  for (const item of diretos) {
    const percentual = Number(item.percentual);
    await sb.from('custos_fixos').update({
      percentual_rateado: percentual * (fator - 1),
      percentual_total: percentual * fator,
    }).eq('id', item.id);
  }

  for (const item of indiretos) {
    await sb.from('custos_fixos').update({
      percentual_rateado: 0,
      percentual_total: Number(item.percentual),
    }).eq('id', item.id);
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ success: false, error: 'Unauthorized', data: [] }, { status: 401 });

  const body = await req.json();
  const { action, empresa_id, ...payload } = body;

  if (!empresa_id) return Response.json({ success: false, error: 'empresa_id obrigatório', data: [] }, { status: 400 });

  const sb = supabaseAdmin();

  try {
    // ─── METAS ───────────────────────────────────────────────────────────────
    if (action === 'listar_meta') {
      const { data, error } = await sb
        .from('metas_operacionais')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) return Response.json({ success: false, error: error.message, data: [] });

      const meta = data?.[0] || null;
      if (!meta) return Response.json({ success: true, data: null, error: null });

      const cap_pl = Number(meta.capacidade_private_label || 0);
      const tm_pl = Number(meta.ticket_medio_private_label || 0);
      const cap_ev = Number(meta.capacidade_eventos || 0);
      const tm_ev = Number(meta.ticket_medio_eventos || 0);

      const meta_producao_anual = (cap_pl + cap_ev) * 12;
      const faturamento_private_label = cap_pl * 12 * tm_pl;
      const faturamento_eventos = cap_ev * 12 * tm_ev;
      const faturamento_total = faturamento_private_label + faturamento_eventos;

      return Response.json({
        success: true,
        data: {
          ...meta,
          meta_producao_anual,
          faturamento_private_label,
          faturamento_eventos,
          faturamento_total,
        },
        error: null,
      });
    }

    if (action === 'salvar_meta') {
      const { id, capacidade_private_label, ticket_medio_private_label, capacidade_eventos, ticket_medio_eventos } = payload;
      const campos = { empresa_id, capacidade_private_label, ticket_medio_private_label, capacidade_eventos, ticket_medio_eventos };

      // Calcula faturamento_total para persistir em meta_faturamento_anual
      const cap_pl = Number(capacidade_private_label || 0);
      const tm_pl = Number(ticket_medio_private_label || 0);
      const cap_ev = Number(capacidade_eventos || 0);
      const tm_ev = Number(ticket_medio_eventos || 0);
      const meta_faturamento_anual = (cap_pl * 12 * tm_pl) + (cap_ev * 12 * tm_ev);
      const camposComFat = { ...campos, meta_faturamento_anual };

      let result, isUpdate = false;
      if (id) {
        const { data: antes } = await sb.from('metas_operacionais').select('*').eq('id', id).single();
        const { data, error } = await sb.from('metas_operacionais').update(camposComFat).eq('id', id).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        result = data; isUpdate = true;
        await registrarLog(base44, 'editar', 'metas_operacionais', id, camposComFat, antes);
      } else {
        const { data, error } = await sb.from('metas_operacionais').insert(camposComFat).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        result = data;
        await registrarLog(base44, 'criar', 'metas_operacionais', result.id, camposComFat);
      }
      return Response.json({ success: true, data: result, error: null });
    }

    // ─── CUSTOS FIXOS ────────────────────────────────────────────────────────
    if (action === 'listar_custos_fixos') {
      const { data, error } = await sb
        .from('custos_fixos')
        .select('*, centros_custo(id, descricao)')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) return Response.json({ success: false, error: error.message, data: [] });

      const enriched = data.map(r => ({ ...r, centro_custo_descricao: r.centros_custo?.descricao || null }));
      const total_direto = enriched.filter(r => r.tipo === 'direto').reduce((s, r) => s + Number(r.percentual || 0), 0);
      const total_indireto = enriched.filter(r => r.tipo === 'indireto').reduce((s, r) => s + Number(r.percentual || 0), 0);

      return Response.json({ success: true, data: enriched, totais: { total_direto, total_indireto }, error: null });
    }

    if (action === 'salvar_custo_fixo') {
      const { id, descricao, percentual, tipo, centro_custo_id } = payload;
      const campos = { empresa_id, descricao, percentual, tipo, centro_custo_id: centro_custo_id || null };

      if (id) {
        const { data: antes } = await sb.from('custos_fixos').select('*').eq('id', id).single();
        const { data, error } = await sb.from('custos_fixos').update(campos).eq('id', id).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'editar', 'custos_fixos', id, campos, antes);
        await recalcularCustosFixos(sb, empresa_id);
        return Response.json({ success: true, data, error: null });
      } else {
        const { data, error } = await sb.from('custos_fixos').insert(campos).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'criar', 'custos_fixos', data.id, campos);
        await recalcularCustosFixos(sb, empresa_id);
        return Response.json({ success: true, data, error: null });
      }
    }

    if (action === 'deletar_custo_fixo') {
      const { id } = payload;
      const { data: antes } = await sb.from('custos_fixos').select('*').eq('id', id).single();
      const { error } = await sb.from('custos_fixos').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) return Response.json({ success: false, error: error.message, data: [] });
      await registrarLog(base44, 'deletar', 'custos_fixos', id, { deleted_at: new Date().toISOString() }, antes);
      await recalcularCustosFixos(sb, empresa_id);
      return Response.json({ success: true, data: null, error: null });
    }

    // ─── DESPESAS VARIÁVEIS ──────────────────────────────────────────────────
    if (action === 'listar_despesas_variaveis') {
      const { data, error } = await sb
        .from('despesas_variaveis')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) return Response.json({ success: false, error: error.message, data: [] });

      const total_despesas = data.reduce((s, r) => s + Number(r.percentual || 0), 0);
      return Response.json({ success: true, data, totais: { total_despesas }, error: null });
    }

    if (action === 'salvar_despesa_variavel') {
      const { id, descricao, percentual } = payload;
      const campos = { empresa_id, descricao, percentual };

      if (id) {
        const { data: antes } = await sb.from('despesas_variaveis').select('*').eq('id', id).single();
        const { data, error } = await sb.from('despesas_variaveis').update(campos).eq('id', id).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'editar', 'despesas_variaveis', id, campos, antes);
        return Response.json({ success: true, data, error: null });
      } else {
        const { data, error } = await sb.from('despesas_variaveis').insert(campos).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'criar', 'despesas_variaveis', data.id, campos);
        return Response.json({ success: true, data, error: null });
      }
    }

    if (action === 'deletar_despesa_variavel') {
      const { id } = payload;
      const { data: antes } = await sb.from('despesas_variaveis').select('*').eq('id', id).single();
      const { error } = await sb.from('despesas_variaveis').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) return Response.json({ success: false, error: error.message, data: [] });
      await registrarLog(base44, 'deletar', 'despesas_variaveis', id, { deleted_at: new Date().toISOString() }, antes);
      return Response.json({ success: true, data: null, error: null });
    }

    // ─── INFORMAÇÕES FINANCEIRAS ─────────────────────────────────────────────
    if (action === 'listar_info_financeira') {
      const { data, error } = await sb
        .from('informacoes_financeiras')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) return Response.json({ success: false, error: error.message, data: [] });

      const total_direto = data.filter(r => r.tipo === 'direto').reduce((s, r) => s + Number(r.percentual || 0), 0);
      const total_indireto = data.filter(r => r.tipo === 'indireto').reduce((s, r) => s + Number(r.percentual || 0), 0);

      return Response.json({ success: true, data, totais: { total_direto, total_indireto }, error: null });
    }

    if (action === 'salvar_info_financeira') {
      const { id, descricao, percentual, tipo, opcao } = payload;
      const opcoesValidas = ["produto", "serviço", "nao_se_aplica"];
      if (opcao && !opcoesValidas.includes(opcao)) {
        return Response.json({ success: false, error: "Opção inválida", data: [] }, { status: 400 });
      }
      const campos = { empresa_id, descricao, percentual, tipo, opcao: opcao || null };

      if (id) {
        const { data: antes } = await sb.from('informacoes_financeiras').select('*').eq('id', id).single();
        const { data, error } = await sb.from('informacoes_financeiras').update(campos).eq('id', id).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'editar', 'informacoes_financeiras', id, campos, antes);
        return Response.json({ success: true, data, error: null });
      } else {
        const { data, error } = await sb.from('informacoes_financeiras').insert(campos).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'criar', 'informacoes_financeiras', data.id, campos);
        return Response.json({ success: true, data, error: null });
      }
    }

    if (action === 'deletar_info_financeira') {
      const { id } = payload;
      const { data: antes } = await sb.from('informacoes_financeiras').select('*').eq('id', id).single();
      const { error } = await sb.from('informacoes_financeiras').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) return Response.json({ success: false, error: error.message, data: [] });
      await registrarLog(base44, 'deletar', 'informacoes_financeiras', id, { deleted_at: new Date().toISOString() }, antes);
      return Response.json({ success: true, data: null, error: null });
    }

    // ─── CUSTOS TERCEIROS ────────────────────────────────────────────────────
    if (action === 'listar_custos_terceiros') {
      const { data, error } = await sb
        .from('custos_terceiros')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('categoria', { ascending: true });
      if (error) return Response.json({ success: false, error: error.message, data: [] });
      return Response.json({ success: true, data, error: null });
    }

    if (action === 'salvar_custo_terceiro') {
      const { id, descricao, valor, categoria } = payload;
      const campos = { empresa_id, descricao, valor, categoria };

      if (id) {
        const { data: antes } = await sb.from('custos_terceiros').select('*').eq('id', id).single();
        const { data, error } = await sb.from('custos_terceiros').update(campos).eq('id', id).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'editar', 'custos_terceiros', id, campos, antes);
        return Response.json({ success: true, data, error: null });
      } else {
        const { data, error } = await sb.from('custos_terceiros').insert(campos).select().single();
        if (error) return Response.json({ success: false, error: error.message, data: [] });
        await registrarLog(base44, 'criar', 'custos_terceiros', data.id, campos);
        return Response.json({ success: true, data, error: null });
      }
    }

    if (action === 'deletar_custo_terceiro') {
      const { id } = payload;
      const { data: antes } = await sb.from('custos_terceiros').select('*').eq('id', id).single();
      const { error } = await sb.from('custos_terceiros').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) return Response.json({ success: false, error: error.message, data: [] });
      await registrarLog(base44, 'deletar', 'custos_terceiros', id, { deleted_at: new Date().toISOString() }, antes);
      return Response.json({ success: true, data: null, error: null });
    }

    return Response.json({ success: false, error: `Ação desconhecida: ${action}`, data: [] }, { status: 400 });

  } catch (err) {
    console.error('[metasCustosOperacionais] Erro:', err);
    return Response.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
});