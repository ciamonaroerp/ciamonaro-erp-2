import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Habilita RLS na tabela modulos_erp
    await base44.asServiceRole.query(`
      ALTER TABLE modulos_erp ENABLE ROW LEVEL SECURITY;
    `);

    // Cria policy para usuários lerem seus próprios módulos
    await base44.asServiceRole.query(`
      CREATE POLICY "usuarios_read_modulos_sua_empresa" 
      ON modulos_erp 
      FOR SELECT 
      USING (
        empresa_id IN (
          SELECT empresa_id FROM erp_usuarios 
          WHERE email = auth.jwt() ->> 'email'
        )
      );
    `);

    // Cria policy para admins fazerem tudo
    await base44.asServiceRole.query(`
      CREATE POLICY "admins_all_modulos" 
      ON modulos_erp 
      FOR ALL 
      USING (
        (SELECT perfil FROM erp_usuarios WHERE email = auth.jwt() ->> 'email') = 'Administrador'
      );
    `);

    return Response.json({ success: true, message: 'RLS habilitado em modulos_erp' });
  } catch (error) {
    console.error('[enableRLSModulosErp]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});