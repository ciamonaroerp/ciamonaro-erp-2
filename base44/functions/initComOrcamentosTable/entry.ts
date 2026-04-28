/**
 * initComOrcamentosTable — Cria a tabela com_orcamentos e trigger de código sequencial
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const sql = `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS public.com_orcamentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID,
        codigo_orcamento TEXT UNIQUE,
        empresa_emitente TEXT,
        vendedor TEXT,
        titulo_orcamento TEXT,
        cliente_nome TEXT,
        cliente_email TEXT,
        cliente_telefone TEXT,
        cliente_whatsapp TEXT,
        cliente_id UUID,
        status TEXT DEFAULT 'ativo',
        data_criacao TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by TEXT,
        deleted_at TIMESTAMP
      );

      INSERT INTO public.config_sequencias (chave, ultimo_numero)
      VALUES ('orcamento', 600)
      ON CONFLICT (chave) DO NOTHING;

      CREATE OR REPLACE FUNCTION trg_orcamento_codigo()
      RETURNS TRIGGER AS $$
      DECLARE
        numero INTEGER;
      BEGIN
        IF NEW.codigo_orcamento IS NULL THEN
          UPDATE public.config_sequencias
          SET ultimo_numero = ultimo_numero + 1
          WHERE chave = 'orcamento'
          RETURNING ultimo_numero INTO numero;
          NEW.codigo_orcamento := 'PRP' || LPAD(numero::TEXT, 4, '0');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_orcamento_codigo ON public.com_orcamentos;

      CREATE TRIGGER trigger_orcamento_codigo
      BEFORE INSERT ON public.com_orcamentos
      FOR EACH ROW
      EXECUTE FUNCTION trg_orcamento_codigo();

      CREATE INDEX IF NOT EXISTS idx_com_orcamentos_codigo
      ON public.com_orcamentos (codigo_orcamento);

      ALTER TABLE public.com_orcamentos DISABLE ROW LEVEL SECURITY;

      GRANT ALL PRIVILEGES ON TABLE public.com_orcamentos TO service_role;
      GRANT ALL PRIVILEGES ON TABLE public.config_sequencias TO service_role;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
      GRANT USAGE ON SCHEMA public TO service_role;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    // Tenta via query direta se rpc não existir
    if (error) {
      // Executa cada statement separado via REST
      const statements = [
        `CREATE TABLE IF NOT EXISTS public.com_orcamentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          empresa_id UUID,
          codigo_orcamento TEXT UNIQUE,
          empresa_emitente TEXT,
          vendedor TEXT,
          titulo_orcamento TEXT,
          cliente_nome TEXT,
          cliente_email TEXT,
          cliente_telefone TEXT,
          cliente_whatsapp TEXT,
          cliente_id UUID,
          status TEXT DEFAULT 'ativo',
          data_criacao TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by TEXT,
          deleted_at TIMESTAMP
        )`,
      ];

      const results = [];
      for (const stmt of statements) {
        const { error: e } = await supabase.rpc('exec_sql', { sql_query: stmt });
        results.push({ stmt: stmt.slice(0, 60), error: e?.message });
      }
      return Response.json({ results, note: 'Execute o SQL manualmente no Supabase se necessário' });
    }

    return Response.json({ success: true, message: 'Tabela com_orcamentos criada com sucesso' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});