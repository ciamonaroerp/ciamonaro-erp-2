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

    // Testa listagem de erp_usuarios
    const { data, error } = await supabase
      .from('erp_usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ 
        error: error.message,
        code: error.code,
        details: error.details 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});