import { supabase } from "@/components/lib/supabaseClient";

async function run(queryFn) {
  if (!supabase) throw new Error("Supabase não inicializado.");
  const { data, error } = await queryFn();
  if (error) throw new Error(error.message);
  return data;
}

function buildQuery(table, action, { data, id, empresa_id, searchTerm } = {}) {
  switch (action) {
    case "list": {
      let q = supabase.from(table).select("*").is("deleted_at", null);
      if (empresa_id) q = q.eq("empresa_id", empresa_id);
      if (searchTerm) q = q.ilike("nome", `%${searchTerm}%`);
      return q;
    }
    case "create":
      return supabase.from(table).insert(data).select().single();
    case "update":
      return supabase.from(table).update(data).eq("id", id).select().single();
    case "delete":
      return supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
}

const crud = (action, table, opts = {}) => run(() => buildQuery(table, action, opts));

export const configTecidoService = {
  listarCores: (empresaId, searchTerm) => crud("list", "config_tecido_cor", { empresa_id: empresaId, searchTerm }),
  criarCor: (data) => crud("create", "config_tecido_cor", { data }),
  atualizarCor: (id, data) => crud("update", "config_tecido_cor", { id, data }),
  softDeletarCor: (id) => crud("delete", "config_tecido_cor", { id }),

  listarArtigos: (empresaId, searchTerm) => crud("list", "config_tecido_artigo", { empresa_id: empresaId, searchTerm }),
  criarArtigo: (data) => crud("create", "config_tecido_artigo", { data }),
  atualizarArtigo: (id, data) => crud("update", "config_tecido_artigo", { id, data }),
  deletarArtigo: (id) => crud("delete", "config_tecido_artigo", { id }),

  listarLinhasComerciais: (empresaId, searchTerm) => crud("list", "config_tecido_linha_comercial", { empresa_id: empresaId, searchTerm }),
  criarLinhaComercial: (data) => crud("create", "config_tecido_linha_comercial", { data }),
  atualizarLinhaComercial: (id, data) => crud("update", "config_tecido_linha_comercial", { id, data }),
  deletarLinhaComercial: (id) => crud("delete", "config_tecido_linha_comercial", { id }),

  listarVinculos: (empresaId, searchTerm) => crud("list", "config_vinculos", { empresa_id: empresaId, searchTerm }),
  criarVinculo: (data) => crud("create", "config_vinculos", { data }),
  atualizarVinculo: (id, data) => crud("update", "config_vinculos", { id, data }),
  deletarVinculo: (id) => crud("delete", "config_vinculos", { id }),
};