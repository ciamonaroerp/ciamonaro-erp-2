import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verifica colunas existentes
  const { data: sample } = await supabase
    .from('tabela_precos_sync')
    .select('*')
    .limit(1)
    .maybeSingle();

  const colunas = sample ? Object.keys(sample) : [];
  const temCorNome = colunas.includes('cor_nome');
  const temLinhaNome = colunas.includes('linha_nome');

  const sqls = [];
  if (!temCorNome) sqls.push("ALTER TABLE tabela_precos_sync ADD COLUMN IF NOT EXISTS cor_nome TEXT;");
  if (!temLinhaNome) sqls.push("ALTER TABLE tabela_precos_sync ADD COLUMN IF NOT EXISTS linha_nome TEXT;");

  if (sqls.length === 0) {
    return Response.json({ message: 'Colunas já existem', colunas_existentes: colunas });
  }

  const { error } = await supabase.rpc('exec_sql', { sql: sqls.join('\n') });
  if (error) {
    return Response.json({
      error: error.message,
      sql_manual: sqls.join('\n'),
      instrucao: 'Execute o SQL manual no Supabase SQL Editor'
    }, { status: 500 });
  }

  return Response.json({ success: true, colunas_adicionadas: sqls });
});