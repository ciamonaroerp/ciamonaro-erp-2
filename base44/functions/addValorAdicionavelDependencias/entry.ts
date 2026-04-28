import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE config_dependencias ADD COLUMN IF NOT EXISTS valor_un_adic numeric(10,2);'
  }).single();

  // Tenta via query direta se rpc não existe
  if (error) {
    const { error: e2 } = await supabase
      .from('config_dependencias')
      .select('valor_un_adic')
      .limit(1);

    if (e2 && e2.message?.includes('valor_un_adic')) {
      return Response.json({ 
        error: 'Coluna não existe. Execute manualmente no Supabase SQL Editor:\nALTER TABLE config_dependencias ADD COLUMN IF NOT EXISTS valor_un_adic numeric(10,2);',
        sql_to_run: 'ALTER TABLE config_dependencias ADD COLUMN IF NOT EXISTS valor_un_adic numeric(10,2);'
      }, { status: 500 });
    }
    return Response.json({ success: true, message: 'Coluna valor_un_adic já existe ou foi criada.' });
  }

  return Response.json({ success: true, message: 'Coluna valor_un_adic adicionada com sucesso.' });
});