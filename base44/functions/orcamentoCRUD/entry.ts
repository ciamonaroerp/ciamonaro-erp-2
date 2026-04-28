/**
 * orcamentoCRUD — CRUD isolado por usuário para com_orcamentos
 * Regra: usuário vê/edita apenas seus próprios orçamentos.
 * Exceção: Administrador ou setor Administrativo têm acesso total.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { action, empresa_id, id } = body;

    // Busca o ErpUsuario pelo email do usuário autenticado
    const { data: erpUser } = await supabase
      .from('erp_usuarios')
      .select('id, perfil, setor')
      .eq('email', user.email)
      .is('deleted_at', null)
      .maybeSingle();

    const isAdmin =
      erpUser?.perfil === 'Administrador' ||
      String(erpUser?.setor || '').toLowerCase() === 'administrativo';

    const erpUserId = erpUser?.id || null;

    // ── LIST ────────────────────────────────────────────────────────────────
    if (action === 'list') {
      let query = supabase
        .from('com_orcamentos')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (empresa_id) query = query.eq('empresa_id', empresa_id);

      // Não-admin vê apenas seus próprios orçamentos
      if (!isAdmin && erpUserId) {
        query = query.eq('usuario_id', erpUserId);
      }

      const { data, error } = await query;
      if (error) return Response.json({ data: [] });
      return Response.json({ data: data || [] });
    }

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      if (!erpUserId) {
        return Response.json({ error: 'Usuário ERP não encontrado. Contacte o administrador.' }, { status: 403 });
      }

      const dados = body.dados || body.data || {};
      const payload = {
        ...dados,
        empresa_id: empresa_id || dados.empresa_id,
        usuario_id: erpUserId, // sempre do backend, nunca do frontend
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('com_orcamentos')
        .insert(payload)
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data });
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 });

      // Valida ownership
      const { data: registro } = await supabase
        .from('com_orcamentos')
        .select('usuario_id')
        .eq('id', id)
        .maybeSingle();

      if (!isAdmin && registro?.usuario_id && registro.usuario_id !== erpUserId) {
        return Response.json({ error: 'Acesso negado: você não tem permissão para alterar este registro.' }, { status: 403 });
      }

      const dados = body.dados || body.data || {};
      const { data, error } = await supabase
        .from('com_orcamentos')
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data });
    }

    // ── DELETE (soft) ────────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 });

      const { data: registro } = await supabase
        .from('com_orcamentos')
        .select('usuario_id')
        .eq('id', id)
        .maybeSingle();

      if (!isAdmin && registro?.usuario_id && registro.usuario_id !== erpUserId) {
        return Response.json({ error: 'Acesso negado: você não tem permissão para excluir este registro.' }, { status: 403 });
      }

      const { error } = await supabase
        .from('com_orcamentos')
        .update({ deleted_at: new Date().toISOString(), status: 'cancelado' })
        .eq('id', id);

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});