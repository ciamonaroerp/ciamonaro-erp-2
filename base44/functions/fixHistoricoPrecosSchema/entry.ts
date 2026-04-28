import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Adiciona as colunas faltantes na tabela historico_precos_produto_erp
    const queries = [
      `ALTER TABLE public.historico_precos_produto_erp ADD COLUMN IF NOT EXISTS descricao_base TEXT`,
      `ALTER TABLE public.historico_precos_produto_erp ADD COLUMN IF NOT EXISTS descricao_complementar TEXT`,
      `ALTER TABLE public.historico_precos_produto_erp ADD COLUMN IF NOT EXISTS descricao_unificada TEXT`,
    ];

    const results = [];
    for (const sql of queries) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();
      if (error) {
        console.error('Erro na query:', sql, error.message);
        results.push({ sql, error: error.message });
      } else {
        results.push({ sql, ok: true });
      }
    }

    // Tenta adicionar constraint única separadamente (ignora se já existe)
    const { error: constraintErr } = await supabase.rpc('exec_sql', {
      sql_query: `DO $$ BEGIN
        ALTER TABLE public.historico_precos_produto_erp ADD CONSTRAINT historico_erp_unique_item UNIQUE (empresa_id, chave_danfe, numero_item);
      EXCEPTION WHEN duplicate_table THEN NULL; WHEN others THEN NULL;
      END $$`
    }).single();
    results.push({ constraint: constraintErr ? constraintErr.message : 'ok' });

    // Recarrega o schema cache do PostgREST
    try { await supabase.rpc('notify_pgrst_reload'); } catch (_) {}

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});