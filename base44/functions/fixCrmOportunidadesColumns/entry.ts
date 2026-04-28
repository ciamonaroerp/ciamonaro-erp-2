import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  // Extract project ref from URL (e.g. https://abcdef.supabase.co → abcdef)
  const match = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = match?.[1];

  if (!projectRef) {
    return Response.json({ error: 'Could not extract project ref', supabaseUrl }, { status: 500 });
  }

  const sql = `
    ALTER TABLE crm_oportunidades ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
    ALTER TABLE crm_oportunidades ADD COLUMN IF NOT EXISTS responsavel_nome TEXT;
    ALTER TABLE crm_oportunidades ADD COLUMN IF NOT EXISTS motivo_perda_nome TEXT;
    ALTER TABLE crm_oportunidades ADD COLUMN IF NOT EXISTS motivo_ganho_nome TEXT;
    ALTER TABLE crm_oportunidades ADD COLUMN IF NOT EXISTS orcamento_id UUID;
    NOTIFY pgrst, 'reload schema';
  `;

  // Try Supabase Management API
  const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const mgmtBody = await mgmtRes.json().catch(() => ({}));

  if (mgmtRes.ok) {
    return Response.json({ ok: true, method: 'management_api', result: mgmtBody });
  }

  // Return the SQL for manual execution as fallback
  return Response.json({
    ok: false,
    method: 'manual_required',
    management_api_error: mgmtBody,
    sql_to_run_manually: sql.trim(),
    instructions: [
      '1. Acesse https://supabase.com/dashboard',
      `2. Selecione o projeto (ref: ${projectRef})`,
      '3. Vá em SQL Editor',
      '4. Cole e execute o SQL em "sql_to_run_manually"',
    ]
  });
});