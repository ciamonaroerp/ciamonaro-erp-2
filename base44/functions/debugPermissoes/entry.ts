/**
 * Debug — Verifica permissões do usuário logado
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Busca exato do usuário no banco de dados
    const { data: erpUser, error: err1 } = await supabase
      .from('erp_usuarios')
      .select('*')
      .eq('email', user.email)
      .single();

    // Busca todos os usuários para debug
    const { data: allUsers, error: err2 } = await supabase
      .from('erp_usuarios')
      .select('id, email, nome, perfil, modulos_autorizados, cadastros_autorizados, sistema_autorizado, status');

    return Response.json({
      base44_user: { email: user.email, full_name: user.full_name },
      erp_user_encontrado: erpUser ? 'SIM' : 'NÃO',
      erp_user_dados: erpUser || null,
      todos_usuarios: allUsers || [],
      erro_busca: err1?.message || null,
      erro_listar: err2?.message || null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});