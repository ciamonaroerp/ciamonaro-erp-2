/**
 * ERP Dynamic CRUD
 * Função centralizada para operações em erp_registros (arquitetura dinâmica).
 *
 * Operações suportadas via campo "action":
 *   create    - Cria um novo registro
 *   list      - Lista registros de um módulo/entidade
 *   get       - Busca registro por ID
 *   update    - Atualiza dados de um registro
 *   delete    - Remove um registro (soft ou hard)
 *   history   - Retorna histórico de um registro
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

    const body = await req.json();
    const { action, modulo_slug, entidade, empresa_id, dados, id, filtros, status, limit = 100, offset = 0 } = body;

    if (!action) {
      return Response.json({ error: 'Campo "action" é obrigatório' }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: "Supabase credentials not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── CREATE ─────────────────────────────────────────────
    if (action === 'create') {
      if (!modulo_slug || !entidade || !dados) {
        return Response.json({ error: 'modulo_slug, entidade e dados são obrigatórios' }, { status: 400 });
      }

      const { data: registro, error } = await supabase
        .from('erp_registros')
        .insert({
          modulo_slug,
          entidade,
          empresa_id: empresa_id || null,
          dados,
          status: status || 'ativo',
          criado_por: user.email,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Registra histórico
      await supabase.from('erp_registro_historico').insert({
        registro_id: registro.id,
        usuario_email: user.email,
        acao: 'criar',
        dados_anteriores: null,
        dados_novos: dados,
      });

      return Response.json({ success: true, data: registro });
    }

    // ─── LIST ────────────────────────────────────────────────
    if (action === 'list') {
      if (!modulo_slug || !entidade) {
        return Response.json({ error: 'modulo_slug e entidade são obrigatórios' }, { status: 400 });
      }

      let query = supabase
        .from('erp_registros')
        .select('*')
        .eq('modulo_slug', modulo_slug)
        .eq('entidade', entidade)
        .neq('status', 'deletado')
        .order('data_criacao', { ascending: false })
        .range(offset, offset + limit - 1);

      if (empresa_id) query = query.eq('empresa_id', empresa_id);
      if (status) query = query.eq('status', status);

      // Filtros dinâmicos sobre o JSONB
      if (filtros && typeof filtros === 'object') {
        for (const [key, value] of Object.entries(filtros)) {
          query = query.eq(`dados->>${key}`, value);
        }
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return Response.json({ success: true, data, total: count });
    }

    // ─── GET ─────────────────────────────────────────────────
    if (action === 'get') {
      if (!id) {
        return Response.json({ error: 'id é obrigatório' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('erp_registros')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);

      return Response.json({ success: true, data });
    }

    // ─── UPDATE ──────────────────────────────────────────────
    if (action === 'update') {
      if (!id || !dados) {
        return Response.json({ error: 'id e dados são obrigatórios' }, { status: 400 });
      }

      // Busca dados atuais para histórico
      const { data: atual } = await supabase
        .from('erp_registros')
        .select('dados')
        .eq('id', id)
        .single();

      const dadosMesclados = { ...(atual?.dados || {}), ...dados };

      const { data: atualizado, error } = await supabase
        .from('erp_registros')
        .update({ dados: dadosMesclados, data_atualizacao: new Date().toISOString(), ...(status ? { status } : {}) })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Registra histórico
      await supabase.from('erp_registro_historico').insert({
        registro_id: id,
        usuario_email: user.email,
        acao: 'editar',
        dados_anteriores: atual?.dados || null,
        dados_novos: dadosMesclados,
      });

      return Response.json({ success: true, data: atualizado });
    }

    // ─── DELETE ──────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) {
        return Response.json({ error: 'id é obrigatório' }, { status: 400 });
      }

      // Soft delete por padrão
      const { data: deletado, error } = await supabase
        .from('erp_registros')
        .update({ status: 'deletado', data_atualizacao: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from('erp_registro_historico').insert({
        registro_id: id,
        usuario_email: user.email,
        acao: 'deletar',
        dados_anteriores: deletado?.dados || null,
        dados_novos: null,
      });

      return Response.json({ success: true, data: deletado });
    }

    // ─── HISTORY ─────────────────────────────────────────────
    if (action === 'history') {
      if (!id) {
        return Response.json({ error: 'id é obrigatório' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('erp_registro_historico')
        .select('*')
        .eq('registro_id', id)
        .order('data_evento', { ascending: false });

      if (error) throw new Error(error.message);

      return Response.json({ success: true, data });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});