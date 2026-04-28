/**
 * ERP Dynamic Service
 * Operações na tabela erp_registros_dinamicos via Supabase direto.
 */
import { supabase } from "@/components/lib/supabaseClient";

async function run(queryFn) {
  if (!supabase) throw new Error("Supabase não inicializado.");
  const { data, error } = await queryFn();
  if (error) throw new Error(error.message);
  return data;
}

export async function createERPRecord(modulo_slug, entidade, dados, empresa_id = null, status = 'ativo') {
  return run(() => supabase.from('erp_registros_dinamicos').insert({
    modulo_slug, entidade, dados, empresa_id, status
  }).select().single());
}

export async function getERPRecords(modulo_slug, entidade, empresa_id = null, { status, limit = 100, offset = 0 } = {}) {
  return run(() => {
    let q = supabase.from('erp_registros_dinamicos').select('*')
      .eq('modulo_slug', modulo_slug)
      .eq('entidade', entidade)
      .range(offset, offset + limit - 1);
    if (empresa_id) q = q.eq('empresa_id', empresa_id);
    if (status) q = q.eq('status', status);
    return q;
  });
}

export async function getERPRecord(id) {
  return run(() => supabase.from('erp_registros_dinamicos').select('*').eq('id', id).single());
}

export async function updateERPRecord(id, dados, status = null) {
  const update = { dados };
  if (status) update.status = status;
  return run(() => supabase.from('erp_registros_dinamicos').update(update).eq('id', id).select().single());
}

export async function deleteERPRecord(id) {
  return run(() => supabase.from('erp_registros_dinamicos').update({ status: 'deletado' }).eq('id', id));
}

export async function getERPRecordHistory(id) {
  return run(() => supabase.from('erp_historico_registros').select('*').eq('registro_id', id).order('created_at', { ascending: false }));
}