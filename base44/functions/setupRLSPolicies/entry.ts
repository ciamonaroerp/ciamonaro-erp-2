import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // SQL para habilitar RLS e criar políticas por empresa_id
    const sql = `
      -- Habilitar RLS
      ALTER TABLE solicitacaoppcp ENABLE ROW LEVEL SECURITY;
      ALTER TABLE solicitacaofrete ENABLE ROW LEVEL SECURITY;
      ALTER TABLE chatcomercial ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notificacaoppcp ENABLE ROW LEVEL SECURITY;
      ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

      -- Dropar políticas antigas se existirem
      DROP POLICY IF EXISTS "Users can access own empresa" ON solicitacaoppcp;
      DROP POLICY IF EXISTS "Users can access own empresa" ON solicitacaofrete;
      DROP POLICY IF EXISTS "Users can access own empresa" ON chatcomercial;
      DROP POLICY IF EXISTS "Users can access own empresa" ON notificacaoppcp;
      DROP POLICY IF EXISTS "Users can access own empresa" ON clientes;
      DROP POLICY IF EXISTS "Users can access own empresa" ON produtos;

      -- SolicitacaoPPCP
      CREATE POLICY "solicitacaoppcp_select" ON solicitacaoppcp FOR SELECT
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "solicitacaoppcp_insert" ON solicitacaoppcp FOR INSERT
        WITH CHECK (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "solicitacaoppcp_update" ON solicitacaoppcp FOR UPDATE
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));

      -- SolicitacaoFrete
      CREATE POLICY "solicitacaofrete_select" ON solicitacaofrete FOR SELECT
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "solicitacaofrete_insert" ON solicitacaofrete FOR INSERT
        WITH CHECK (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "solicitacaofrete_update" ON solicitacaofrete FOR UPDATE
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));

      -- ChatComercial
      CREATE POLICY "chatcomercial_select" ON chatcomercial FOR SELECT
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "chatcomercial_insert" ON chatcomercial FOR INSERT
        WITH CHECK (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));

      -- NotificacaoPPCP
      CREATE POLICY "notificacaoppcp_select" ON notificacaoppcp FOR SELECT
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "notificacaoppcp_insert" ON notificacaoppcp FOR INSERT
        WITH CHECK (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));

      -- Clientes
      CREATE POLICY "clientes_select" ON clientes FOR SELECT
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "clientes_insert" ON clientes FOR INSERT
        WITH CHECK (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));

      -- Produtos
      CREATE POLICY "produtos_select" ON produtos FOR SELECT
        USING (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
      
      CREATE POLICY "produtos_insert" ON produtos FOR INSERT
        WITH CHECK (empresa_id = (SELECT empresa_id FROM erp_usuarios WHERE id = auth.uid() LIMIT 1));
    `;

    return Response.json({
      message: "RLS policies configuradas",
      sql: sql,
      instructions: "Execute no Supabase > SQL Editor"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});