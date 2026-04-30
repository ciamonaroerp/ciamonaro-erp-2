import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Busca todos os erp_usuarios via Supabase REST direto para ver estrutura real
    const res = await fetch(`${SUPABASE_URL}/rest/v1/erp_usuarios?select=id,email,perfil,empresa_id&limit=20`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const usuarios = await res.json();

    // Também verifica a estrutura da tabela
    const schemaRes = await fetch(`${SUPABASE_URL}/rest/v1/erp_usuarios?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    const schemaData = await schemaRes.json();
    const colunas = schemaData?.[0] ? Object.keys(schemaData[0]) : [];

    return Response.json({
      usuarios,
      colunas_disponiveis: colunas,
      tem_empresa_id: colunas.includes('empresa_id'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});