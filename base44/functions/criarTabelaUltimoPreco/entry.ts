import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY'),
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS ultimo_preco_produto (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo_unico text NOT NULL,
        empresa_id text NOT NULL,
        ultimo_preco numeric NOT NULL,
        data_ultima_nf timestamptz,
        fornecedor_nome text,
        numero_nf text,
        updated_at timestamptz DEFAULT now(),
        UNIQUE (codigo_unico, empresa_id)
      );
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('[criarTabelaUltimoPreco] Erro via rpc:', error.message);

      // Tenta via query direta
      const { error: e2 } = await supabase.from('ultimo_preco_produto').select('id').limit(1);
      if (!e2) {
        return Response.json({ sucesso: true, mensagem: 'Tabela já existe' });
      }

      return Response.json({ sucesso: false, erro: error.message }, { status: 500 });
    }

    return Response.json({ sucesso: true, mensagem: 'Tabela criada com sucesso' });
  } catch (err) {
    return Response.json({ sucesso: false, erro: err.message }, { status: 500 });
  }
});