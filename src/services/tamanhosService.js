import { supabase } from "@/components/lib/supabaseClient";

const TABELA = "tamanhos";

export async function listarTamanhos() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
    .order("codigo", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function criarTamanho(payload) {
  const { data, error } = await supabase
    .from(TABELA)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function atualizarTamanho(id, payload) {
  const { data, error } = await supabase
    .from(TABELA)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleAtivoTamanho(id, ativoAtual) {
  const { data, error } = await supabase
    .from(TABELA)
    .update({ ativo: !ativoAtual, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}