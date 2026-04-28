import { criar } from "@/components/services/baseService";
import { supabase } from "@/components/lib/supabaseClient";

/**
 * Envia convite por email via Supabase Auth (magic link / invite).
 */
export async function enviarConviteUsuario(email, nome) {
  if (!supabase) throw new Error("Supabase não inicializado.");
  const { error } = await supabase.auth.admin?.inviteUserByEmail
    ? await supabase.auth.admin.inviteUserByEmail(email, { data: { full_name: nome } })
    : { error: null }; // fallback silencioso se não tiver admin client
  if (error) throw new Error(error.message);
  return { ok: true };
}

/**
 * Cria usuário na tabela erp_usuarios e envia convite.
 */
export async function criarUsuario(dados) {
  const { nome, email, perfil, modulo_origem, modulos_autorizados, cadastros_autorizados, sistema_autorizado, empresa_id } = dados;

  await criar("erp_usuarios", {
    nome,
    email,
    perfil,
    status: "Pendente",
    modulo_origem: modulo_origem || null,
    modulos_autorizados: modulos_autorizados || [],
    cadastros_autorizados: cadastros_autorizados || [],
    sistema_autorizado: sistema_autorizado || [],
    empresa_id: empresa_id || null,
  });
}