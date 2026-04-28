/**
 * Fix one-time: concede permissões ao service_role nas tabelas de fornecedores
 * Execute pelo dashboard: Code > Functions > fixFornecedoresPermissions > Test
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SQL = `
GRANT ALL ON TABLE public.fornecedores_contatos TO service_role, authenticated, anon;
GRANT ALL ON TABLE public.fornecedores_observacoes TO service_role, authenticated, anon;
GRANT ALL ON TABLE public.fornecedores_pagamentos TO service_role, authenticated, anon;
ALTER TABLE public.fornecedores_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores_observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores_pagamentos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fornecedores_contatos' AND policyname = 'allow_all_service_role') THEN
    CREATE POLICY "allow_all_service_role" ON public.fornecedores_contatos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fornecedores_observacoes' AND policyname = 'allow_all_service_role') THEN
    CREATE POLICY "allow_all_service_role" ON public.fornecedores_observacoes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fornecedores_pagamentos' AND policyname = 'allow_all_service_role') THEN
    CREATE POLICY "allow_all_service_role" ON public.fornecedores_pagamentos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tenta via RPC exec_sql se existir
    const { error: rpcError } = await supabase.rpc('exec_sql', { query: SQL });

    if (rpcError) {
      // RPC não existe — retorna SQL para executar manualmente
      return Response.json({
        success: false,
        message: 'Execute o SQL abaixo manualmente no Supabase SQL Editor (Dashboard > SQL Editor)',
        sql: SQL,
        rpc_error: rpcError.message
      });
    }

    return Response.json({ success: true, message: 'Permissões aplicadas com sucesso!' });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});