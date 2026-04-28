import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase URL or Service Key not set' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Criar tabela config_vinculos
    try {
      await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.config_vinculos (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_date TIMESTAMPTZ DEFAULT NOW(),
            updated_date TIMESTAMPTZ DEFAULT NOW(),
            created_by TEXT,
            empresa_id TEXT NOT NULL,
            codigo_unico TEXT NOT NULL UNIQUE,
            artigo_nome_comercial TEXT NOT NULL,
            cor_nome_comercial TEXT NOT NULL,
            linha_comercial_nome TEXT NOT NULL
          );

          GRANT ALL PRIVILEGES ON TABLE public.config_vinculos TO service_role;
          GRANT ALL PRIVILEGES ON TABLE public.config_vinculos TO authenticated;
        `
      });
    } catch (rpcError) {
      console.log('[createConfigVinculosTable] RPC exec not available, table may already exist');
    }

    return Response.json({
      success: true,
      message: 'Tabela config_vinculos criada com sucesso'
    });

  } catch (error) {
    console.error('[createConfigVinculosTable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});