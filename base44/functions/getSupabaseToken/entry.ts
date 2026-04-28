import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[getSupabaseToken] Usuário não autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[getSupabaseToken] Buscando dados para:', user.email);

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const anonKey = Deno.env.get("VITE_SUPABASE_ANON_KEY");

    console.log('[getSupabaseToken] Supabase URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.log('[getSupabaseToken] Service Key:', serviceKey ? 'OK' : 'MISSING');

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Busca erp_usuario pelo email
    let erpUsuarioData = null;
    
    try {
      const { data: exactMatch, error: exactError } = await supabaseAdmin
        .from('erp_usuarios')
        .select('id, empresa_id, perfil, modulos_autorizados, cadastros_autorizados, sistema_autorizado, status, nome, email')
        .eq('email', user.email)
        .maybeSingle();

      if (exactError) {
        console.warn('[getSupabaseToken] Erro ao buscar erp_usuario (eq):', exactError.message);
      } else {
        erpUsuarioData = exactMatch;
      }
    } catch (e) {
      console.warn('[getSupabaseToken] Exceção ao buscar erp_usuario (eq):', e.message);
    }

    if (!erpUsuarioData) {
      console.log('[getSupabaseToken] Não encontrado com eq, tentando ilike...');
      try {
        const { data: ilikeMatch, error: ilikeError } = await supabaseAdmin
          .from('erp_usuarios')
          .select('id, empresa_id, perfil, modulos_autorizados, cadastros_autorizados, sistema_autorizado, status, nome, email')
          .ilike('email', user.email)
          .maybeSingle();

        if (ilikeError) {
          console.warn('[getSupabaseToken] Erro ao buscar erp_usuario (ilike):', ilikeError.message);
        } else {
          erpUsuarioData = ilikeMatch;
        }
      } catch (e) {
        console.warn('[getSupabaseToken] Exceção ao buscar erp_usuario (ilike):', e.message);
      }
    }

    // Se ainda não encontrou, criar automaticamente como Administrador
    if (!erpUsuarioData) {
      console.log('[getSupabaseToken] erp_usuario não existe, criando automaticamente...');
      try {
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('erp_usuarios')
          .insert({
            email: user.email,
            nome: user.full_name || 'Usuário',
            perfil: 'Administrador',
            status: 'Ativo',
            modulos_autorizados: ['Comercial', 'PPCP', 'Logística', 'Financeiro', 'Compras', 'Estoque MP', 'Estoque PA'],
            cadastros_autorizados: ['*'],
            sistema_autorizado: ['*']
          })
          .select('id, empresa_id, perfil, modulos_autorizados, cadastros_autorizados, sistema_autorizado, status, nome, email')
          .single();

        if (createError) {
          console.error('[getSupabaseToken] Erro ao criar erp_usuario:', createError.message);
        } else {
          erpUsuarioData = newUser;
          console.log('[getSupabaseToken] erp_usuario criado com sucesso:', newUser.email);
        }
      } catch (e) {
        console.error('[getSupabaseToken] Exceção ao criar erp_usuario:', e.message);
      }
    } else {
      console.log('[getSupabaseToken] erp_usuario encontrado:', erpUsuarioData.email, '| perfil:', erpUsuarioData.perfil);
    }

    const normalizedErpUser = erpUsuarioData ? {
      ...erpUsuarioData,
      modulos_autorizados: Array.isArray(erpUsuarioData.modulos_autorizados) ? erpUsuarioData.modulos_autorizados : [],
      cadastros_autorizados: Array.isArray(erpUsuarioData.cadastros_autorizados) ? erpUsuarioData.cadastros_autorizados : [],
      sistema_autorizado: Array.isArray(erpUsuarioData.sistema_autorizado) ? erpUsuarioData.sistema_autorizado : [],
    } : null;

    return Response.json({
      access_token: anonKey,
      erpUsuario: normalizedErpUser
    });

  } catch (error) {
    console.error('[getSupabaseToken] Erro fatal:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});