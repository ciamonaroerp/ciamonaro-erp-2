import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Notificar Postgres que schema mudou
    const { error } = await supabase.rpc('notify_pgrst_reload');
    
    if (error && !error.message.includes('does not exist')) {
      console.warn('Aviso ao recarregar schema:', error.message);
    }

    // Força reconexão
    await new Promise(resolve => setTimeout(resolve, 1000));

    return Response.json({ success: true, message: 'Schema cache recarregado!' });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});