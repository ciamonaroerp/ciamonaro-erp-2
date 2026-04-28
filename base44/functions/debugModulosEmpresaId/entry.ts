import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { empresa_id } = await req.json().catch(() => ({}));

    // Lista todos os empresa_id únicos em modulos_erp
    const { data: empresasEmModulos } = await base44.asServiceRole.query(`
      SELECT DISTINCT empresa_id, COUNT(*) as count 
      FROM modulos_erp 
      GROUP BY empresa_id 
      ORDER BY count DESC;
    `);

    // Tenta buscar com o empresa_id fornecido
    let resultadoFiltro = null;
    if (empresa_id) {
      const { data } = await base44.asServiceRole.query(`
        SELECT id, nome_modulo, empresa_id 
        FROM modulos_erp 
        WHERE empresa_id = $1 
        LIMIT 5;
      `, [empresa_id]);
      resultadoFiltro = data;
    }

    return Response.json({
      empresasEmModulos,
      resultadoFiltro,
      empresa_id_testado: empresa_id || 'não fornecido'
    });
  } catch (error) {
    console.error('[debugModulosEmpresaId]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});