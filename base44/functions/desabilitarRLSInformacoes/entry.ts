import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Execute SQL to disable RLS
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE informacoes_condicoes_comerciais DISABLE ROW LEVEL SECURITY;'
    });

    if (error) {
      console.error('RPC error:', error);
      // RPC pode não existir, tenta via admin query
      return Response.json({ 
        error: 'RPC exec_sql não disponível. Execute manualmente no Supabase: ALTER TABLE informacoes_condicoes_comerciais DISABLE ROW LEVEL SECURITY;',
        details: error.message 
      }, { status: 500 });
    }

    return Response.json({ success: true, message: 'RLS desabilitado com sucesso' });
  } catch (err) {
    console.error('Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});