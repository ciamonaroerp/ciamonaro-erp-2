/**
 * sistemaLog — Captura silenciosa de erros Supabase na tabela sistema_logs.
 * Nunca lança exceção. Use sempre dentro de um bloco if (error).
 */
import { supabase } from "@/components/lib/supabaseClient";

export async function sistemaLog({ empresa_id, usuario_email, modulo, acao, mensagem_erro, dados_erro, nivel = "ERROR" }) {
  try {
    if (!supabase) return;
    await supabase.from("sistema_logs").insert({
      empresa_id: empresa_id || null,
      usuario_email: usuario_email || null,
      modulo: modulo || "Sistema",
      acao: acao || null,
      mensagem_erro: mensagem_erro || null,
      dados_erro: dados_erro ? JSON.stringify(dados_erro) : null,
      nivel,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[sistema_logs] Falha ao registrar:", e.message);
  }
}