import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Adiciona coluna ordem_modulo à tabela modulos_erp
    const { error: alterError } = await base44.asServiceRole.query(
      `ALTER TABLE modulos_erp ADD COLUMN IF NOT EXISTS ordem_modulo INTEGER DEFAULT 0;`
    );

    if (alterError) throw alterError;

    // Popula ordem_modulo com valores sequenciais baseado em created_at
    const { error: updateError } = await base44.asServiceRole.query(
      `UPDATE modulos_erp SET ordem_modulo = ROW_NUMBER() OVER (ORDER BY created_at ASC) WHERE ordem_modulo = 0;`
    );

    if (updateError) throw updateError;

    return Response.json({ success: true, message: 'Coluna ordem_modulo criada e populada' });
  } catch (error) {
    console.error('[addOrdemModuloColumn]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});