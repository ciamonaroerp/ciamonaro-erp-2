import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  const headers = {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Prefer': 'return=representation',
  };

  // Usa o endpoint SQL do Supabase (Management API não disponível, usa pg via REST)
  // Tenta dropar via query direto na tabela usando update para forçar execução
  // Como não temos exec_sql, vamos tentar via fetch direto ao endpoint /rest/v1/rpc/
  // Alternativa: usar o endpoint de SQL nativo
  const sqlEndpoint = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

  // Tenta listar triggers via query na pg_trigger
  const listRes = await fetch(`${supabaseUrl}/rest/v1/rpc/list_config_vinculos_triggers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  // Dropa o trigger via SQL direto
  const dropRes = await fetch(`${supabaseUrl}/rest/v1/rpc/drop_bloquear_delete_trigger`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  const dropBody = await dropRes.text();

  return Response.json({
    drop_status: dropRes.status,
    drop_body: dropBody,
    message: 'Se drop_status=200, trigger removido com sucesso. Caso contrário, execute no SQL Editor do Supabase: DROP TRIGGER IF EXISTS trg_bloquear_delete_codigo_unico ON config_vinculos;'
  });
});