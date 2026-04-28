import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const sqls = [
      // Tabela principal
      `CREATE TABLE IF NOT EXISTS public.servicos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID,
        codigo_servico TEXT UNIQUE,
        nome_servico TEXT NOT NULL,
        descricao TEXT,
        setor_producao TEXT,
        status TEXT DEFAULT 'ativo',
        data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT
      )`,

      // Índice
      `CREATE INDEX IF NOT EXISTS idx_servicos_empresa_id ON public.servicos (empresa_id)`,

      // Sequência na config_sequencias (se existir a tabela)
      `INSERT INTO public.config_sequencias (chave, ultimo_numero)
       VALUES ('servico', 0)
       ON CONFLICT (chave) DO NOTHING`,

      // Função de geração de código (depende de gerar_codigo_sequencial já existente)
      `CREATE OR REPLACE FUNCTION trg_servico_codigo()
       RETURNS TRIGGER AS $$
       BEGIN
         IF NEW.codigo_servico IS NULL THEN
           NEW.codigo_servico := gerar_codigo_sequencial('SE', 'servico');
         END IF;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,

      // Trigger
      `DROP TRIGGER IF EXISTS trigger_servico_codigo ON public.servicos`,

      `CREATE TRIGGER trigger_servico_codigo
       BEFORE INSERT ON public.servicos
       FOR EACH ROW
       EXECUTE FUNCTION trg_servico_codigo()`,

      // RLS e permissões
      `ALTER TABLE public.servicos DISABLE ROW LEVEL SECURITY`,
      `GRANT ALL PRIVILEGES ON TABLE public.servicos TO service_role`,
      `GRANT ALL PRIVILEGES ON TABLE public.config_sequencias TO service_role`,
      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role`,
      `GRANT USAGE ON SCHEMA public TO service_role`,
    ];

    const results = [];
    for (const sql of sqls) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle().catch(() => ({ error: null }));
      results.push({ sql: sql.substring(0, 80).replace(/\n/g, ' '), ok: !error, error: error?.message });
    }

    return Response.json({ success: true, message: 'Tabela servicos inicializada!', results });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});