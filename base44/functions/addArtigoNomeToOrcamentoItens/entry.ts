import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Invoca supabaseCRUD para executar ALTER TABLE
    const res = await base44.asServiceRole.functions.invoke('supabaseCRUD', {
      action: 'raw_sql',
      sql: `ALTER TABLE orcamento_itens
           ADD COLUMN IF NOT EXISTS artigo_nome TEXT;
           COMMENT ON COLUMN orcamento_itens.artigo_nome IS 'Nome do artigo/material';`
    });

    return Response.json({ success: true, message: 'Column artigo_nome added', data: res.data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});