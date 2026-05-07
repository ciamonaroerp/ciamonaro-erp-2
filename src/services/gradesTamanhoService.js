// Service: acesso ao Supabase para Grades de Tamanho
import { supabase } from "@/components/lib/supabaseClient";

const TABELA = "grades_tamanho";

export async function listarGrades() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
    .order("nome_grade", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function criarGrade(payload) {
  const { data, error } = await supabase
    .from(TABELA)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function atualizarGrade(id, payload) {
  const { data, error } = await supabase
    .from(TABELA)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleAtivoGrade(id, ativo) {
  const { data, error } = await supabase
    .from(TABELA)
    .update({ ativo: !ativo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}