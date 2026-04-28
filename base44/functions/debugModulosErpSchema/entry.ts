import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtém schema da tabela modulos_erp
    const { data, error } = await base44.asServiceRole.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'modulos_erp'
      ORDER BY ordinal_position;
    `);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ schema: data });
  } catch (error) {
    console.error('[debugModulosErpSchema]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});