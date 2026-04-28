import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const result = await base44.functions.invoke('supabaseCRUD', {
      action: 'executeSQL',
      sql: `
        ALTER TABLE orcamento_itens
        ADD CONSTRAINT fk_orcamento_itens_orcamento_id
        FOREIGN KEY (orcamento_id)
        REFERENCES com_orçamentos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
      `
    });

    console.log('[addFKOrcamentoItens] FK constraint criada:', result);
    return Response.json({ success: true, message: 'Foreign Key constraint adicionada com sucesso' });
  } catch (error) {
    console.error('[addFKOrcamentoItens] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});