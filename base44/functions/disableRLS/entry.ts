import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: "Supabase config missing" }, { status: 500 });
    }

    // SQL para desativar RLS em todas as tabelas
    const sql = `
      ALTER TABLE erp_usuarios DISABLE ROW LEVEL SECURITY;
      ALTER TABLE perfis_acesso DISABLE ROW LEVEL SECURITY;
      ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
      ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
      ALTER TABLE solicitacaoppcp DISABLE ROW LEVEL SECURITY;
      ALTER TABLE solicitacaofrete DISABLE ROW LEVEL SECURITY;
      ALTER TABLE chatcomercial DISABLE ROW LEVEL SECURITY;
      ALTER TABLE notificacaoppcp DISABLE ROW LEVEL SECURITY;
      ALTER TABLE modulos_erp DISABLE ROW LEVEL SECURITY;
    `;

    return Response.json({
      message: "RLS desativado em todas as tabelas",
      sql: sql,
      instructions: "Execute esse SQL no Supabase SQL Editor (Dashboard > SQL Editor > New Query)"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});