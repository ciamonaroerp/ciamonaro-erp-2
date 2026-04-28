import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Cria tabela com service_role
    const { error: createErr } = await supabase
      .rpc('exec_sql', {
        query: `CREATE TABLE IF NOT EXISTS informacoes_condicoes_comerciais (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          sequencia int NOT NULL,
          descricao text NOT NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          deleted_at timestamptz
        );`
      })
      .catch(err => ({ error: err }));

    // Índices
    await supabase.rpc('exec_sql', {
      query: `CREATE INDEX IF NOT EXISTS idx_info_cond_seq ON informacoes_condicoes_comerciais(sequencia);`
    }).catch(() => ({}));

    await supabase.rpc('exec_sql', {
      query: `CREATE INDEX IF NOT EXISTS idx_info_cond_del ON informacoes_condicoes_comerciais(deleted_at);`
    }).catch(() => ({}));

    return Response.json({ ok: true, message: 'Tabela criada com sucesso' });
  } catch (err) {
    console.error('Erro:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});