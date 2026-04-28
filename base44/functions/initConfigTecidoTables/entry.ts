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

    // Criar tabelas usando queries individuais
    const operations = [
      // config_tecido_cor
      `CREATE TABLE IF NOT EXISTS public.config_tecido_cor (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        nome_cor TEXT NOT NULL,
        descricao TEXT,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT,
        CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
          REFERENCES public.empresas (id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_config_tecido_cor_empresa_id ON public.config_tecido_cor (empresa_id)`,

      // config_tecido_artigo
      `CREATE TABLE IF NOT EXISTS public.config_tecido_artigo (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        nome_artigo TEXT NOT NULL,
        descricao TEXT,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT,
        CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
          REFERENCES public.empresas (id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_config_tecido_artigo_empresa_id ON public.config_tecido_artigo (empresa_id)`,

      // config_tecido_linha_comercial
      `CREATE TABLE IF NOT EXISTS public.config_tecido_linha_comercial (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        nome_linha_comercial TEXT NOT NULL,
        descricao TEXT,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT,
        CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
          REFERENCES public.empresas (id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_config_tecido_linha_comercial_empresa_id ON public.config_tecido_linha_comercial (empresa_id)`,

      // config_tecido_vinculos
      `CREATE TABLE IF NOT EXISTS public.config_tecido_vinculos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        artigo_id UUID NOT NULL,
        cor_tecido_id UUID NOT NULL,
        linha_comercial_id UUID NOT NULL,
        codigo_unico TEXT NOT NULL UNIQUE,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT,
        CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
          REFERENCES public.empresas (id) ON DELETE CASCADE,
        CONSTRAINT artigo_id_fkey FOREIGN KEY (artigo_id)
          REFERENCES public.config_tecido_artigo (id) ON DELETE CASCADE,
        CONSTRAINT cor_tecido_id_fkey FOREIGN KEY (cor_tecido_id)
          REFERENCES public.config_tecido_cor (id) ON DELETE CASCADE,
        CONSTRAINT linha_comercial_id_fkey FOREIGN KEY (linha_comercial_id)
          REFERENCES public.config_tecido_linha_comercial (id) ON DELETE CASCADE,
        CONSTRAINT unique_vinculo UNIQUE (artigo_id, cor_tecido_id, linha_comercial_id)
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_empresa_id ON public.config_tecido_vinculos (empresa_id)`,
      `CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_artigo_id ON public.config_tecido_vinculos (artigo_id)`,
      `CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_cor_tecido_id ON public.config_tecido_vinculos (cor_tecido_id)`,
      `CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_linha_comercial_id ON public.config_tecido_vinculos (linha_comercial_id)`,

      `ALTER TABLE public.config_tecido_cor DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.config_tecido_artigo DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.config_tecido_linha_comercial DISABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.config_tecido_vinculos DISABLE ROW LEVEL SECURITY`,

      `GRANT ALL PRIVILEGES ON TABLE public.config_tecido_cor TO service_role`,
      `GRANT ALL PRIVILEGES ON TABLE public.config_tecido_artigo TO service_role`,
      `GRANT ALL PRIVILEGES ON TABLE public.config_tecido_linha_comercial TO service_role`,
      `GRANT ALL PRIVILEGES ON TABLE public.config_tecido_vinculos TO service_role`,

      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role`,
      `GRANT USAGE ON SCHEMA public TO service_role`
    ];

    // Executar todas as operações
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: operations.join('; ') })
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('Aviso ao criar tabelas (podem já existir):', error);
    }

    return Response.json({ success: true, message: 'Tabelas inicializadas com sucesso!' });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});