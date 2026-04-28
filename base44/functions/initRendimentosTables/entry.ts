import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const results = [];

    const sqls = [
      {
        label: 'produto_rendimentos',
        sql: `CREATE TABLE IF NOT EXISTS public.produto_rendimentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          empresa_id TEXT NOT NULL,
          nome TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.produto_rendimentos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_role_all_rendimentos" ON public.produto_rendimentos;
        CREATE POLICY "service_role_all_rendimentos" ON public.produto_rendimentos
          FOR ALL TO service_role USING (true) WITH CHECK (true);`
      },
      {
        label: 'produto_rendimento_valores',
        sql: `CREATE TABLE IF NOT EXISTS public.produto_rendimento_valores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          empresa_id TEXT NOT NULL,
          rendimento_id UUID NOT NULL REFERENCES public.produto_rendimentos(id) ON DELETE CASCADE,
          produto_id TEXT NOT NULL,
          descricao_artigo TEXT NOT NULL,
          valor NUMERIC(12,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(rendimento_id, produto_id, descricao_artigo)
        );
        ALTER TABLE public.produto_rendimento_valores ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_role_all_rendimento_valores" ON public.produto_rendimento_valores;
        CREATE POLICY "service_role_all_rendimento_valores" ON public.produto_rendimento_valores
          FOR ALL TO service_role USING (true) WITH CHECK (true);`
      }
    ];

    for (const { label, sql } of sqls) {
      const res = await fetch(`${Deno.env.get('VITE_SUPABASE_URL')}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': Deno.env.get('SUPABASE_SERVICE_KEY'),
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });
      const text = await res.text();
      results.push({ label, status: res.status, body: text.substring(0, 200) });
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});