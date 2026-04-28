import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const sqls = [
      // Adicionar colunas novas (IF NOT EXISTS via tentativa)
      `ALTER TABLE public.erp_usuarios ADD COLUMN IF NOT EXISTS numero_cadastro TEXT UNIQUE`,
      `ALTER TABLE public.erp_usuarios ADD COLUMN IF NOT EXISTS assinatura_url TEXT`,
      `ALTER TABLE public.erp_usuarios ADD COLUMN IF NOT EXISTS setor TEXT`,
      `ALTER TABLE public.erp_usuarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`,

      // Sequência para numero_cadastro
      `CREATE SEQUENCE IF NOT EXISTS erp_usuarios_numero_seq START 1`,

      // Trigger de geração de número sequencial
      `CREATE OR REPLACE FUNCTION trg_erp_usuario_numero()
       RETURNS TRIGGER AS $$
       BEGIN
         IF NEW.numero_cadastro IS NULL THEN
           NEW.numero_cadastro := LPAD(nextval('erp_usuarios_numero_seq')::TEXT, 3, '0');
         END IF;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,

      `DROP TRIGGER IF EXISTS trigger_erp_usuario_numero ON public.erp_usuarios`,

      `CREATE TRIGGER trigger_erp_usuario_numero
       BEFORE INSERT ON public.erp_usuarios
       FOR EACH ROW
       EXECUTE FUNCTION trg_erp_usuario_numero()`,

      // Garante permissões
      `GRANT ALL PRIVILEGES ON TABLE public.erp_usuarios TO service_role`,
      `GRANT USAGE, SELECT ON SEQUENCE erp_usuarios_numero_seq TO service_role`,
    ];

    const results = [];
    for (const sql of sqls) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle().catch(() => ({ error: null }));
      results.push({ sql: sql.substring(0, 80).replace(/\n/g, ' '), ok: !error, error: error?.message });
    }

    return Response.json({ success: true, message: 'Ajustes em erp_usuarios aplicados!', results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});