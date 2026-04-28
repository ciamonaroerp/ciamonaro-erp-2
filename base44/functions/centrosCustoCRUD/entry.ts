import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

function ok(data) {
  return Response.json({ success: true, data: data ?? [], error: null });
}
function err(msg, status = 200) {
  return Response.json({ success: false, data: [], error: msg }, { status });
}

async function log(action, payload) {
  await supabase.from('audit_logs').insert({
    acao: action,
    entidade: 'centros_custo',
    dados_novos: JSON.stringify(payload),
    data_evento: new Date().toISOString(),
  }).maybeSingle();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return err('Unauthorized', 401);

    const body = await req.json();
    const { action, empresa_id, id, data } = body;

    // ── LISTAR ────────────────────────────────────────────────────────────────
    if (action === 'listar') {
      if (!empresa_id) return err('empresa_id obrigatório');
      const { data: rows, error } = await supabase
        .from('centros_custo')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('descricao', { ascending: true });
      if (error) return err(error.message);
      return ok(rows);
    }

    // ── CRIAR ─────────────────────────────────────────────────────────────────
    if (action === 'criar') {
      if (!empresa_id || !data?.descricao) return err('empresa_id e descricao obrigatórios');
      const { data: row, error } = await supabase
        .from('centros_custo')
        .insert({ empresa_id, descricao: data.descricao, ativo: true })
        .select()
        .single();
      if (error) return err(error.message);
      await log('criar', row);
      return ok(row);
    }

    // ── EDITAR ────────────────────────────────────────────────────────────────
    if (action === 'editar') {
      if (!id || !data) return err('id e data obrigatórios');
      const { data: row, error } = await supabase
        .from('centros_custo')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) return err(error.message);
      await log('editar', row);
      return ok(row);
    }

    // ── EXCLUIR (com validação de vínculo) ───────────────────────────────────
    if (action === 'excluir') {
      if (!id) return err('id obrigatório');

      // Valida vínculos
      const [{ count: cp }, { count: cr }] = await Promise.all([
        supabase.from('contas_pagar').select('id', { count: 'exact', head: true }).eq('centro_custo_id', id).is('deleted_at', null),
        supabase.from('contas_receber').select('id', { count: 'exact', head: true }).eq('centro_custo_id', id).is('deleted_at', null),
      ]);

      if ((cp ?? 0) > 0 || (cr ?? 0) > 0) {
        return err(`Não é possível excluir: este centro de custo está vinculado a ${(cp ?? 0) + (cr ?? 0)} lançamento(s) financeiro(s).`);
      }

      const { error } = await supabase
        .from('centros_custo')
        .update({ deleted_at: new Date().toISOString(), ativo: false })
        .eq('id', id);
      if (error) return err(error.message);
      await log('excluir', { id });
      return ok(null);
    }

    // ── RESUMO FINANCEIRO POR CENTRO DE CUSTO ────────────────────────────────
    if (action === 'resumo_financeiro') {
      if (!empresa_id) return err('empresa_id obrigatório');

      const [{ data: centros }, { data: pagar }, { data: receber }] = await Promise.all([
        supabase.from('centros_custo').select('id, descricao').eq('empresa_id', empresa_id).is('deleted_at', null),
        supabase.from('contas_pagar').select('centro_custo_id, valor').eq('empresa_id', empresa_id).is('deleted_at', null),
        supabase.from('contas_receber').select('centro_custo_id, valor').eq('empresa_id', empresa_id).is('deleted_at', null),
      ]);

      const resumo = (centros || []).map(cc => {
        const total_pagar = (pagar || []).filter(r => r.centro_custo_id === cc.id).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
        const total_receber = (receber || []).filter(r => r.centro_custo_id === cc.id).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
        return { centro_custo_id: cc.id, descricao: cc.descricao, total_pagar, total_receber, saldo: total_receber - total_pagar };
      });

      return ok(resumo);
    }

    // ── VALIDAR VÍNCULO ───────────────────────────────────────────────────────
    if (action === 'validar_vinculo') {
      if (!id) return err('id obrigatório');
      const [{ count: cp }, { count: cr }] = await Promise.all([
        supabase.from('contas_pagar').select('id', { count: 'exact', head: true }).eq('centro_custo_id', id).is('deleted_at', null),
        supabase.from('contas_receber').select('id', { count: 'exact', head: true }).eq('centro_custo_id', id).is('deleted_at', null),
      ]);
      const total = (cp ?? 0) + (cr ?? 0);
      return ok({ tem_vinculo: total > 0, total_vinculos: total });
    }

    return err('Ação não reconhecida');
  } catch (e) {
    return err(e.message, 500);
  }
});