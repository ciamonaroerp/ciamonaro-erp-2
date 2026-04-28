import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id } = await req.json();

    // Validar que o user_id solicitado é o mesmo do usuário autenticado
    if (user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar erp_usuarios onde id = auth.uid()
    const usuarios = await base44.asServiceRole.entities.ErpUsuarios.filter({
      id: user_id
    });

    if (!usuarios || usuarios.length === 0) {
      return Response.json({ 
        error: 'Usuário não encontrado em erp_usuarios' 
      }, { status: 404 });
    }

    const usuarioErp = usuarios[0];

    if (!usuarioErp.empresa_id) {
      return Response.json({ 
        error: 'empresa_id não configurado para este usuário' 
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      empresa_id: usuarioErp.empresa_id,
      usuario_id: usuarioErp.id
    });
  } catch (error) {
    console.error('Erro ao carregar empresa do usuário:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});