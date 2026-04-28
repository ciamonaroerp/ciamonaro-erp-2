/**
 * createAuditLogsTable — Cria a tabela audit_logs no Supabase
 * Executa uma única vez para inicializar o sistema de auditoria
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso apenas para administradores' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // SQL para criar a tabela
    const sql = `
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        empresa_id uuid,
        usuario_id uuid,
        usuario_nome text,
        usuario_email text NOT NULL,
        modulo text,
        tabela_afetada text,
        registro_id uuid,
        tipo_operacao text CHECK (tipo_operacao IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'BLOCK', 'UNBLOCK', 'PERMISSION_CHANGE')),
        campo_alterado text,
        valor_anterior text,
        valor_novo text,
        descricao text,
        ip_usuario text,
        user_agent text,
        created_at timestamp with time zone DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa ON public.audit_logs(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON public.audit_logs(usuario_email);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela ON public.audit_logs(tabela_afetada);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tipo ON public.audit_logs(tipo_operacao);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
      
      ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY audit_logs_select_policy ON public.audit_logs
        FOR SELECT
        USING (empresa_id = (SELECT empresa_id FROM public.erp_usuarios WHERE email = auth.jwt() ->> 'email') OR auth.jwt() ->> 'role' = 'admin');

      CREATE POLICY audit_logs_insert_policy ON public.audit_logs
        FOR INSERT
        WITH CHECK (true);
    `;

    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      // Tenta criar sem RPC (alternativa)
      return Response.json({
        message: 'Execute este SQL no Supabase SQL Editor:',
        sql: sql.trim()
      }, { status: 200 });
    }

    return Response.json({ success: true, message: 'Tabela audit_logs criada com sucesso' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});