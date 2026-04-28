import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { action, id, descricao } = body;

    // ─── LIST ────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const { data, error } = await supabase
        .from('informacoes_condicoes_comerciais')
        .select('id, sequencia, descricao')
        .is('deleted_at', null)
        .order('sequencia', { ascending: true });
      
      if (error) {
        console.error('List error:', error);
        return Response.json({ data: [] });
      }
      return Response.json({ data: data || [] });
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      if (!descricao || !descricao.trim()) {
        return Response.json({ error: 'Descrição é obrigatória' }, { status: 400 });
      }

      // Calcula próxima sequência
      const { data: items } = await supabase
        .from('informacoes_condicoes_comerciais')
        .select('sequencia')
        .is('deleted_at', null)
        .order('sequencia', { ascending: false })
        .limit(1);

      const proximaSeq = items && items.length > 0 ? items[0].sequencia + 1 : 1;

      const { data, error } = await supabase
        .from('informacoes_condicoes_comerciais')
        .insert({ sequencia: proximaSeq, descricao: descricao.trim() })
        .select();

      if (error) {
        console.error('Create error:', error);
        return Response.json({ error: `Erro ao salvar: ${error.message}` }, { status: 500 });
      }

      return Response.json({ data: data[0] });
    }

    // ─── UPDATE ──────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id || !descricao) {
        return Response.json({ error: 'ID e descrição são obrigatórios' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('informacoes_condicoes_comerciais')
        .update({ descricao: descricao.trim(), updated_date: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Update error:', error);
        return Response.json({ error: `Erro ao atualizar: ${error.message}` }, { status: 500 });
      }

      return Response.json({ data: data[0] });
    }

    // ─── DELETE (SOFT) ───────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) {
        return Response.json({ error: 'ID é obrigatório' }, { status: 400 });
      }

      // Excluir o registro
      const { error: deleteError } = await supabase
        .from('informacoes_condicoes_comerciais')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return Response.json({ error: `Erro ao deletar: ${deleteError.message}` }, { status: 500 });
      }

      // Recarregar lista e renumerar sequência obrigatoriamente
      const { data: itemsRestantes, error: listError } = await supabase
        .from('informacoes_condicoes_comerciais')
        .select('id')
        .order('sequencia', { ascending: true });

      if (!listError && itemsRestantes && itemsRestantes.length > 0) {
        // Atualizar cada item com sequência 1, 2, 3, 4...
        for (let seq = 1; seq <= itemsRestantes.length; seq++) {
          const { error: updateError } = await supabase
            .from('informacoes_condicoes_comerciais')
            .update({ sequencia: seq })
            .eq('id', itemsRestantes[seq - 1].id);
          
          if (updateError) {
            console.error(`Erro ao atualizar sequência do item ${itemsRestantes[seq - 1].id}:`, updateError);
          }
        }
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    console.error('Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});