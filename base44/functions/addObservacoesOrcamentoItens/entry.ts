import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await (await import('npm:@supabase/supabase-js@2')).createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('VITE_SUPABASE_ANON_KEY')
  ).rpc('exec_sql', {
    sql: `ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS observacoes TEXT;`
  });

  if (error) {
    // Tenta via query direta
    const supabase = (await import('npm:@supabase/supabase-js@2')).createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('VITE_SUPABASE_ANON_KEY')
    );
    return Response.json({ error: error.message, hint: 'Execute manualmente no Supabase SQL Editor: ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS observacoes TEXT;' }, { status: 500 });
  }

  return Response.json({ success: true, message: 'Coluna observacoes adicionada com sucesso na tabela orcamento_itens.' });
});