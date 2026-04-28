import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const sql = `
      CREATE TABLE IF NOT EXISTS tabela_precos_sync (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        empresa_id UUID NOT NULL,
        produto_id UUID NOT NULL,
        codigo_produto TEXT,
        nome_produto TEXT NOT NULL,
        artigo_id UUID,
        codigo_unico TEXT,
        descricao_artigo TEXT,
        num_composicoes INTEGER DEFAULT 0,
        composicoes JSONB DEFAULT '[]'::jsonb,
        sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tps_empresa ON tabela_precos_sync (empresa_id);
      CREATE INDEX IF NOT EXISTS idx_tps_produto ON tabela_precos_sync (produto_id);
      CREATE INDEX IF NOT EXISTS idx_tps_codigo_unico ON tabela_precos_sync (codigo_unico);

      ALTER TABLE tabela_precos_sync ENABLE ROW LEVEL SECURITY;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'tabela_precos_sync' AND policyname = 'service_role_all'
        ) THEN
          CREATE POLICY "service_role_all" ON tabela_precos_sync
            FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Tenta via query direta
      const { error: e2 } = await supabase.from('tabela_precos_sync').select('id').limit(1);
      if (e2) return Response.json({ error: 'Não foi possível criar a tabela. Use o script SQL manualmente.', detail: error.message }, { status: 400 });
    }

    return Response.json({ success: true, message: 'Tabela tabela_precos_sync criada/verificada com sucesso.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});