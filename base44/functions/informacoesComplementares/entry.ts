import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { action, id, titulo, descricao } = await req.json();

    // Listar informações não deletadas
    if (action === 'list') {
      const { data, error } = await supabase
        .from('informacoes_complementares')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('List error:', error);
        return Response.json({ error: `Erro ao listar: ${error.message}` }, { status: 500 });
      }

      return Response.json({ data: data || [] });
    }

    // Criar nova informação
    if (action === 'create') {
      if (!titulo || !descricao) {
        return Response.json({ error: 'Título e descrição são obrigatórios' }, { status: 400 });
      }

      const { error } = await supabase
        .from('informacoes_complementares')
        .insert([{ titulo, descricao }]);

      if (error) {
        console.error('Create error:', error);
        return Response.json({ error: `Erro ao criar: ${error.message}` }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    // Atualizar informação
    if (action === 'update') {
      if (!id || !titulo || !descricao) {
        return Response.json({ error: 'ID, título e descrição são obrigatórios' }, { status: 400 });
      }

      const { error } = await supabase
        .from('informacoes_complementares')
        .update({ titulo, descricao })
        .eq('id', id);

      if (error) {
        console.error('Update error:', error);
        return Response.json({ error: `Erro ao atualizar: ${error.message}` }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    // Soft delete
    if (action === 'delete') {
      if (!id) {
        return Response.json({ error: 'ID é obrigatório' }, { status: 400 });
      }

      const { error } = await supabase
        .from('informacoes_complementares')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        return Response.json({ error: `Erro ao deletar: ${error.message}` }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    console.error('Function error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});