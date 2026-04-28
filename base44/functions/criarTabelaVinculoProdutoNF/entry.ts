import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY'),
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sql = `
      CREATE TABLE IF NOT EXISTS vinculo_produto_nf (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        empresa_id text NOT NULL,
        fornecedor_id text NOT NULL,
        descricao_nf text,
        descricao_normalizada text NOT NULL,
        codigo_unico text NOT NULL,
        score numeric DEFAULT 1,
        origem text DEFAULT 'auto' CHECK (origem IN ('historico', 'auto', 'manual')),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT uq_vinculo_nf UNIQUE (empresa_id, fornecedor_id, descricao_normalizada)
      );

      CREATE INDEX IF NOT EXISTS idx_vnf_empresa_forn_desc
        ON vinculo_produto_nf(empresa_id, fornecedor_id, descricao_normalizada);

      CREATE INDEX IF NOT EXISTS idx_vnf_codigo_unico
        ON vinculo_produto_nf(codigo_unico);

      -- Permissões
      GRANT SELECT, INSERT, UPDATE ON vinculo_produto_nf TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON vinculo_produto_nf TO service_role;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Tenta via query direta (fallback)
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      const resultados = [];
      for (const stmt of statements) {
        const { error: e } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).catch(err => ({ error: err }));
        resultados.push({ stmt: stmt.slice(0, 60), error: e?.message || null });
      }
      return Response.json({ sucesso: true, resultados, aviso: 'Executado por partes' });
    }

    return Response.json({ sucesso: true, message: 'Tabela vinculo_produto_nf criada com sucesso' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});