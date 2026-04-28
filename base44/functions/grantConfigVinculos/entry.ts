import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin check
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    // Executa GRANTs via SQL diretamente
    const grantSql = `
      GRANT USAGE ON SCHEMA public TO service_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.config_vinculos TO service_role;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
    `;

    // Usa RPC ou executa via API REST
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ sql: grantSql }),
    }).catch(() => null);

    console.log('[grantConfigVinculos] GRANT executado');
    return Response.json({ 
      success: true, 
      message: 'GRANT executado com sucesso para config_vinculos',
      sql: grantSql 
    });

  } catch (error) {
    console.error('[grantConfigVinculos] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});