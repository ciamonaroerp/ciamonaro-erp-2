import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (_req) => {
  // Tenta inserir um registro de teste com numero_item para ver se coluna existe
  const { error: checkErr } = await supabase
    .from('estoque_movimentacoes')
    .select('numero_item')
    .limit(1);

  if (!checkErr) {
    return Response.json({ ok: true, message: 'Coluna numero_item já existe' });
  }

  // Usa a API Management do Supabase para rodar SQL
  const url = Deno.env.get('VITE_SUPABASE_URL');
  const projectRef = url.replace('https://', '').replace('.supabase.co', '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  const res = await fetch(`${url}/rest/v1/rpc/exec_ddl`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ddl: 'ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS numero_item integer;' })
  });

  if (!res.ok) {
    return Response.json({
      error: 'Não foi possível criar a coluna automaticamente.',
      instruction: 'Execute manualmente no Supabase SQL Editor: ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS numero_item integer;'
    }, { status: 500 });
  }

  return Response.json({ ok: true, message: 'Coluna numero_item adicionada com sucesso' });
});