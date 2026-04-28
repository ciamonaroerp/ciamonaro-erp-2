import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  const sql = `
    ALTER TABLE crm_oportunidades
      ADD COLUMN IF NOT EXISTS cor_id UUID,
      ADD COLUMN IF NOT EXISTS linha_comercial_id UUID,
      ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
      ADD COLUMN IF NOT EXISTS quantidade NUMERIC,
      ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC,
      ADD COLUMN IF NOT EXISTS valor NUMERIC,
      ADD COLUMN IF NOT EXISTS responsavel_id TEXT,
      ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
      ADD COLUMN IF NOT EXISTS funil_id UUID,
      ADD COLUMN IF NOT EXISTS observacoes TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto';
    NOTIFY pgrst, 'reload schema';
  `;

  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // fallback: tentar via REST direto
    const fallback = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });
    const fbText = await fallback.text();
    return Response.json({ 
      warning: 'Management API falhou, tente o SQL manualmente no Supabase',
      sql,
      fallback_response: fbText
    });
  }

  return Response.json({ success: true, message: 'Colunas adicionadas com sucesso!' });
});