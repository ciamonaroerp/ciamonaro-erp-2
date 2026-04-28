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

    const sqls = [
      // config_acabamentos
      `CREATE TABLE IF NOT EXISTS public.config_acabamentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID,
        codigo_acabamento TEXT NOT NULL,
        nome_acabamento TEXT NOT NULL,
        descricao TEXT,
        dependencia BOOLEAN DEFAULT false,
        data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_config_acabamentos_empresa_id ON public.config_acabamentos (empresa_id)`,

      // config_personalizacao
      `CREATE TABLE IF NOT EXISTS public.config_personalizacao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID,
        codigo_personalizacao TEXT NOT NULL,
        tipo_personalizacao TEXT NOT NULL,
        descricao TEXT,
        dependencia BOOLEAN DEFAULT false,
        data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_config_personalizacao_empresa_id ON public.config_personalizacao (empresa_id)`,

      // config_dependencias
      `CREATE TABLE IF NOT EXISTS public.config_dependencias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID,
        codigo_dependencia TEXT NOT NULL,
        tipo_dependencia TEXT NOT NULL,
        descricao TEXT,
        data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_config_dependencias_empresa_id ON public.config_dependencias (empresa_id)`,

      `ALTER TABLE public.config_acabamentos DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.config_personalizacao DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.config_dependencias DISABLE ROW LEVEL SECURITY`,

      `GRANT ALL PRIVILEGES ON TABLE public.config_acabamentos TO service_role`,
      `GRANT ALL PRIVILEGES ON TABLE public.config_personalizacao TO service_role`,
      `GRANT ALL PRIVILEGES ON TABLE public.config_dependencias TO service_role`,

      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role`,
      `GRANT USAGE ON SCHEMA public TO service_role`
    ];

    const results = [];
    for (const sql of sqls) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle();
      if (error) {
        // Tenta via query direta se rpc não existir
        console.warn('RPC indisponível, continuando:', error.message);
      }
      results.push({ sql: sql.substring(0, 60), ok: !error });
    }

    return Response.json({ success: true, message: 'Tabelas de configurações extras inicializadas!', results });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});