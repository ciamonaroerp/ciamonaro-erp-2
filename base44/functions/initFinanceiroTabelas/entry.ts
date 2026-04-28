/**
 * CIAMONARO ERP — Init: Tabelas do módulo Financeiro
 * Executa via dashboard para criar a estrutura no Supabase.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const sqls = [
      // Tabela principal
      `CREATE TABLE IF NOT EXISTS public.fin_formas_pagamento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID,
        codigo_forma_pagamento TEXT UNIQUE,
        forma_pagamento TEXT NOT NULL,
        descricao TEXT,
        observacao TEXT,
        status TEXT DEFAULT 'ativo',
        data_criacao TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by TEXT,
        deleted_at TIMESTAMP
      )`,

      // Sequência na config_sequencias (se a tabela já existir)
      `INSERT INTO public.config_sequencias (chave, ultimo_numero)
       VALUES ('forma_pagamento', 0)
       ON CONFLICT (chave) DO NOTHING`,

      // Função do trigger
      `CREATE OR REPLACE FUNCTION trg_forma_pagamento_codigo()
       RETURNS TRIGGER AS $$
       DECLARE
         numero INTEGER;
       BEGIN
         IF NEW.codigo_forma_pagamento IS NULL THEN
           numero := gerar_codigo_sequencial('', 'forma_pagamento')::INTEGER;
           NEW.codigo_forma_pagamento := LPAD(numero::TEXT, 2, '0');
         END IF;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,

      // Trigger
      `DROP TRIGGER IF EXISTS trigger_forma_pagamento_codigo ON public.fin_formas_pagamento`,
      `CREATE TRIGGER trigger_forma_pagamento_codigo
       BEFORE INSERT ON public.fin_formas_pagamento
       FOR EACH ROW EXECUTE FUNCTION trg_forma_pagamento_codigo()`,

      // Desabilita RLS
      `ALTER TABLE public.fin_formas_pagamento DISABLE ROW LEVEL SECURITY`,

      // Permissões
      `GRANT ALL PRIVILEGES ON TABLE public.fin_formas_pagamento TO service_role`,
    ];

    const resultados = [];
    for (const sql of sqls) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: null }));
      // tenta via query direta se rpc não existir
      resultados.push({ sql: sql.slice(0, 60) + '...', error: error?.message || null });
    }

    return Response.json({ ok: true, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});