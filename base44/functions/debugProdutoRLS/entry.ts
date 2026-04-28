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

    // Tenta listar tabelas
    const { data: tabelas, error: tabelasError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public');

    console.log('Tabelas:', { data: tabelas, error: tabelasError });

    // Testa acesso a produto_comercial
    const { data: prod, error: prodError } = await supabase
      .from('produto_comercial')
      .select('id')
      .limit(1);

    console.log('Produto Commercial:', { data: prod, error: prodError });

    return Response.json({ 
      produto_comercial_error: prodError?.message,
      produto_comercial_details: prodError?.details,
      message: 'Debug completo'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});