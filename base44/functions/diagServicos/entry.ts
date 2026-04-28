import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const empresaId = "73045062-97e0-43b5-b95d-a1be96b4a0f2";

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Testa sem filtro nenhum
    const r1 = await supabase.from('servicos').select('*').limit(10);
    // Testa com empresa_id
    const r2 = await supabase.from('servicos').select('*').eq('empresa_id', empresaId).limit(10);
    // Verifica colunas via information_schema
    let r3 = {};
    try { r3 = await supabase.rpc('exec_sql', { sql: "select column_name, data_type from information_schema.columns where table_name='servicos' order by ordinal_position" }); } catch(e) { r3 = { error: e.message }; }
    // Conta total
    const r4 = await supabase.from('servicos').select('id, empresa_id, status', { count: 'exact' });

    return Response.json({
      sem_filtro: { data: r1.data, error: r1.error?.message, count: r1.data?.length },
      com_empresa_id: { data: r2.data, error: r2.error?.message, count: r2.data?.length },
      colunas: r3.data || r3.error,
      contagem: { count: r4.count, error: r4.error?.message, amostra: r4.data?.slice(0, 5) },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});