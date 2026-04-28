import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Listar schema de com_orçamentos
    const schemaCom = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'com_orcamentos'
        ORDER BY ordinal_position;
      `
    });

    // 2. Listar schema de orcamento_itens
    const schemaItens = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'orcamento_itens'
        ORDER BY ordinal_position;
      `
    });

    // 3. Verificar Foreign Key constraint
    const fkCheck = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `
        SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (table_name = 'orcamento_itens' OR table_name = 'com_orcamentos');
      `
    });

    // 4. Contar registros
    const countCom = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `SELECT COUNT(*) as total FROM com_orcamentos;`
    });

    const countItens = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `SELECT COUNT(*) as total FROM orcamento_itens;`
    });

    // 5. Listar todos os com_orçamentos
    const allCom = await base44.functions.invoke('supabaseCRUD', {
      action: 'list',
      table: 'com_orcamentos',
      limit: 1000
    });

    // 6. Listar todos os orcamento_itens
    const allItens = await base44.functions.invoke('supabaseCRUD', {
      action: 'list',
      table: 'orcamento_itens',
      limit: 1000
    });

    // 7. Verificar itens órfãos (orcamento_id que não existe em com_orcamentos)
    const orphanCheck = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `
        SELECT oi.id, oi.orcamento_id, oi.sequencia
        FROM orcamento_itens oi
        LEFT JOIN com_orcamentos co ON oi.orcamento_id = co.id
        WHERE co.id IS NULL;
      `
    });

    // 8. Contar itens por orçamento
    const itensPerOrcamento = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `
        SELECT co.id, co.codigo_orcamento, COUNT(oi.id) as total_itens
        FROM com_orcamentos co
        LEFT JOIN orcamento_itens oi ON co.id = oi.orcamento_id
        GROUP BY co.id, co.codigo_orcamento
        ORDER BY co.created_at DESC;
      `
    });

    // 9. Verificar se há orçamentos vazios
    const emptyOrcamentos = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `
        SELECT co.id, co.codigo_orcamento, co.titulo_orcamento, co.created_at
        FROM com_orcamentos co
        LEFT JOIN orcamento_itens oi ON co.id = oi.orcamento_id
        WHERE oi.id IS NULL
        ORDER BY co.created_at DESC;
      `
    });

    return Response.json({
      success: true,
      schema: {
        com_orcamentos: extractData(schemaCom),
        orcamento_itens: extractData(schemaItens)
      },
      foreignKeyConstraint: extractData(fkCheck),
      counts: {
        com_orcamentos: extractData(countCom)?.[0]?.total || 0,
        orcamento_itens: extractData(countItens)?.[0]?.total || 0
      },
      data: {
        allCom: extractData(allCom),
        allItens: extractData(allItens)
      },
      integrity: {
        orphanItems: extractData(orphanCheck),
        itensPerOrcamento: extractData(itensPerOrcamento),
        emptyOrcamentos: extractData(emptyOrcamentos)
      }
    });
  } catch (error) {
    console.error('[auditarOrcamentosIntegridade]:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractData(response) {
  return response?.data?.data || response?.data || [];
}