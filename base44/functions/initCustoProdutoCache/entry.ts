import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
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
      { auth: { persistSession: false } }
    );

    const { error } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS custo_produto_cache (
        codigo_unico TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL,
        custo_kg NUMERIC(10,2),
        consumo NUMERIC(10,3),
        custo_unitario NUMERIC(10,2),
        atualizado_em TIMESTAMP DEFAULT now()
      );`
    });

    if (error) {
      // Tenta via query direta se rpc não disponível
      const { error: e2 } = await supabase
        .from('custo_produto_cache')
        .select('codigo_unico')
        .limit(1);

      if (e2 && e2.code === '42P01') {
        return Response.json({ error: 'Tabela não existe. Execute o SQL manualmente no Supabase Dashboard.', sql: 'CREATE TABLE IF NOT EXISTS custo_produto_cache (codigo_unico TEXT PRIMARY KEY, empresa_id TEXT NOT NULL, custo_kg NUMERIC(10,2), consumo NUMERIC(10,3), custo_unitario NUMERIC(10,2), atualizado_em TIMESTAMP DEFAULT now());' }, { status: 500 });
      }

      return Response.json({ ok: true, note: 'Tabela já existe ou foi criada.' });
    }

    return Response.json({ ok: true, message: 'Tabela custo_produto_cache criada com sucesso.' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});