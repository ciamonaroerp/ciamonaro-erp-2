/**
 * CIAMONARO ERP — Base Service
 * Todas as operações diretas ao Supabase (sem proxy Base44).
 */
import { supabase } from "@/components/lib/supabaseClient";
import { toast } from "sonner";

// Helper interno: executa query e trata erros
async function run(queryFn) {
  if (!supabase) {
    const msg = "Supabase não inicializado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.";
    toast.error(msg);
    throw new Error(msg);
  }
  const { data, error } = await queryFn();
  if (error) {
    toast.error(error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function listar(tabela, empresa_id = null, filtros = {}) {
  return run(() => {
    let q = supabase.from(tabela).select("*");
    if (empresa_id) q = q.eq("empresa_id", empresa_id);
    Object.entries(filtros).forEach(([k, v]) => { if (v !== undefined && v !== null) q = q.eq(k, v); });
    return q;
  });
}

export async function criar(tabela, dados) {
  const payload = Array.isArray(dados) ? dados[0] : dados;
  return run(() => supabase.from(tabela).insert(payload).select().single());
}

export async function atualizar(tabela, id, dados) {
  return run(() => supabase.from(tabela).update(dados).eq("id", id).select().single());
}

export async function deletar(tabela, id) {
  return run(() => supabase.from(tabela).delete().eq("id", id));
}

export async function buscarPorId(tabela, id) {
  const result = await run(() => supabase.from(tabela).select("*").eq("id", id).maybeSingle());
  return result || null;
}

/**
 * Filtra um objeto mantendo apenas as colunas permitidas pela tabela.
 * Converte strings vazias em null.
 */
export function sanitizeBySchema(data, allowedColumns) {
  const clean = {};
  allowedColumns.forEach(col => {
    if (data[col] !== undefined) {
      clean[col] = data[col] === "" ? null : data[col];
    }
  });
  return clean;
}