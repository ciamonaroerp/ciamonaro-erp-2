import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * REGRA ABSOLUTA: NUNCA fazer hard delete (DELETE)
 * Sempre usar soft delete: update deleted_at
 * 
 * Uso:
 * await base44.functions.invoke('softDelete', {
 *   table: 'produto_comercial',
 *   id: 'uuid-123',
 *   empresa_id: 'empresa-uuid'
 * });
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, id, empresa_id } = await req.json();

    if (!table || !id || !empresa_id) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: table, id, empresa_id' 
      }, { status: 400 });
    }

    const supabase = await base44.asServiceRole.supabase.getClient();
    const agora = new Date().toISOString();

    const { error } = await supabase
      .from(table)
      .update({ 
        deleted_at: agora,
        deleted_by: user.email 
      })
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: `Registro ${id} marcado como deletado em ${table}`,
      deleted_at: agora,
      deleted_by: user.email,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});