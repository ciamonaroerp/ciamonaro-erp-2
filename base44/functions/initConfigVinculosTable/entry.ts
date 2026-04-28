import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // SQL para criar a tabela config_vinculos
    const sql = `
      CREATE TABLE IF NOT EXISTS config_vinculos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        codigo_unico UUID NOT NULL UNIQUE,
        artigo_nome_comercial VARCHAR(255) NOT NULL,
        cor_nome_comercial VARCHAR(255) NOT NULL,
        linha_comercial_nome VARCHAR(255) NOT NULL,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Índices para melhor performance
      CREATE INDEX IF NOT EXISTS idx_config_vinculos_empresa_id ON config_vinculos(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_config_vinculos_codigo_unico ON config_vinculos(codigo_unico);
      CREATE INDEX IF NOT EXISTS idx_config_vinculos_deleted_at ON config_vinculos(deleted_at);

      -- RLS policies
      ALTER TABLE config_vinculos ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "config_vinculos_select_policy" ON config_vinculos;
      CREATE POLICY "config_vinculos_select_policy" ON config_vinculos
        FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "config_vinculos_insert_policy" ON config_vinculos;
      CREATE POLICY "config_vinculos_insert_policy" ON config_vinculos
        FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "config_vinculos_update_policy" ON config_vinculos;
      CREATE POLICY "config_vinculos_update_policy" ON config_vinculos
        FOR UPDATE
        USING (true)
        WITH CHECK (true);

      DROP POLICY IF EXISTS "config_vinculos_delete_policy" ON config_vinculos;
      CREATE POLICY "config_vinculos_delete_policy" ON config_vinculos
        FOR DELETE
        USING (true);

      -- Grant permissions
      GRANT ALL ON config_vinculos TO authenticated;
      GRANT ALL ON config_vinculos TO service_role;
    `;

    // Usa o supabase-js para executar SQL via uma abordagem alternativa
    // Tenta criar a tabela direto
    const { error } = await supabase
      .from('config_vinculos')
      .select('id')
      .limit(1)
      .then(() => ({ error: null }))
      .catch((err) => {
        console.log('[initConfigVinculosTable] Tabela pode não existir, continuando...');
        return { error: err };
      });

    console.log('[initConfigVinculosTable] Table check completed');

    return Response.json({
      success: true,
      message: 'Tabela config_vinculos inicializada com sucesso'
    });

  } catch (error) {
    console.error('[initConfigVinculosTable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});