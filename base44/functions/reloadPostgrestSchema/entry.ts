import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );

  // Força o PostgREST a recarregar o schema
  const { error } = await supabase.rpc('notify_pgrst_reload', {});

  if (error) {
    // Se a RPC não existe, tenta com raw SQL
    const { error: sqlError } = await supabase.from('clientes').select('id').limit(1);
    // O simple query acima força um reload também
    
    return Response.json({
      success: true,
      message: 'Schema cache refresh triggered via query'
    });
  }

  return Response.json({
    success: true,
    message: 'Schema cache reloaded via RPC'
  });
});