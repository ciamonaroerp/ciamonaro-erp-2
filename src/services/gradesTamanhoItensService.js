import { supabase } from "@/components/lib/supabaseClient";

const TABELA = "grades_tamanho_itens";

export async function listarItensPorGrade(gradeId) {
  if (!supabase || !gradeId) return [];
  const { data, error } = await supabase
    .from(TABELA)
    .select("*, tamanhos(id, codigo, descricao)")
    .eq("grade_id", gradeId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function criarItem(payload) {
  const { data, error } = await supabase
    .from(TABELA)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function atualizarItem(id, payload) {
  const { data, error } = await supabase
    .from(TABELA)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Soft-delete: nunca exclui fisicamente para preservar histórico
export async function desativarItem(id) {
  const { data, error } = await supabase
    .from(TABELA)
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleAtivoItem(id, ativoAtual) {
  const { data, error } = await supabase
    .from(TABELA)
    .update({ ativo: !ativoAtual, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}