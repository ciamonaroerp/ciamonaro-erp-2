import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Busca registro na entidade ErpUsuarios pelo email
    const registros = await base44.asServiceRole.entities.ErpUsuarios.filter({ email: user.email });

    let result;
    if (registros && registros.length > 0) {
      const reg = registros[0];
      result = await base44.asServiceRole.entities.ErpUsuarios.update(reg.id, {
        perfil: 'Administrador',
        status: 'Ativo',
        modulos_autorizados: [],
        cadastros_autorizados: [],
        sistema_autorizado: [],
      });
    } else {
      result = await base44.asServiceRole.entities.ErpUsuarios.create({
        nome: user.full_name || user.email,
        email: user.email,
        perfil: 'Administrador',
        status: 'Ativo',
        modulos_autorizados: [],
        cadastros_autorizados: [],
        sistema_autorizado: [],
      });
    }

    return Response.json({
      success: true,
      message: `Usuário ${user.email} promovido a Administrador com sucesso.`,
      data: result
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});