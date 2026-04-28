/**
 * registrarAuditLog — Registra eventos na tabela audit_logs do Supabase
 * Chamada por todas as operações CRUD do sistema
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

export async function registrarAuditLog(supabase, {
  usuario_id,
  usuario_nome,
  usuario_email,
  empresa_id,
  modulo,
  tabela_afetada,
  tipo_operacao, // CREATE, UPDATE, DELETE, STATUS_CHANGE, BLOCK, UNBLOCK, PERMISSION_CHANGE
  registro_id = null,
  campo_alterado = null,
  valor_anterior = null,
  valor_novo = null,
  descricao = '',
  ip_usuario = 'backend',
  user_agent = null
}) {
  try {
    const log = {
      usuario_id: usuario_id || null,
      usuario_nome: usuario_nome || usuario_email,
      usuario_email: usuario_email,
      empresa_id: empresa_id,
      modulo: modulo,
      tabela_afetada: tabela_afetada,
      registro_id: registro_id,
      tipo_operacao: tipo_operacao,
      campo_alterado: campo_alterado,
      valor_anterior: valor_anterior ? String(valor_anterior) : null,
      valor_novo: valor_novo ? String(valor_novo) : null,
      descricao: descricao,
      ip_usuario: ip_usuario,
      user_agent: user_agent,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([log]);

    if (error) {
      console.error('Erro ao registrar audit log:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Erro em registrarAuditLog:', err);
    return { success: false, error: err.message };
  }
}