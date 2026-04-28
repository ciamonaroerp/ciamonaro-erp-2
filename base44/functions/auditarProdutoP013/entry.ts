import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const empresa_id = '73045062-97e0-43b5-b95d-a1be96b4a0f2';
    const produto_id_p013 = 'a2ec85f2-e31b-4a76-b8a0-1e66c10765f3';

    // Produtos P012 e P013
    const { data: produtos } = await supabase
      .from('produto_comercial')
      .select('id, codigo, nome')
      .eq('empresa_id', empresa_id)
      .in('codigo', ['P012', 'P013']);

    // Artigos do P013 (incluindo deletados)
    const { data: artigos013 } = await supabase
      .from('produto_comercial_artigo')
      .select('id, produto_id, artigo_nome, cor_nome, codigo_unico, variavel_index, deleted_at')
      .eq('produto_id', produto_id_p013)
      .eq('empresa_id', empresa_id);

    // Todos os artigos da empresa
    const { data: todosArtigos } = await supabase
      .from('produto_comercial_artigo')
      .select('id, produto_id, artigo_nome, cor_nome, codigo_unico, deleted_at')
      .eq('empresa_id', empresa_id);

    // tabela_precos_sync do P013
    const { data: syncById } = await supabase
      .from('tabela_precos_sync')
      .select('id, codigo_produto, artigo_id, descricao_artigo, codigo_unico, deleted_at, created_at, updated_at, tipo_produto')
      .eq('produto_id', produto_id_p013)
      .eq('empresa_id', empresa_id);

    return Response.json({
      produto_id_p013: produto_id_p013,
      produtos_encontrados: produtos,
      artigos013_ativos: (artigos013 || []).filter(function(a) { return !a.deleted_at; }),
      artigos013_deletados: (artigos013 || []).filter(function(a) { return !!a.deleted_at; }),
      todos_artigos_empresa: todosArtigos,
      sync_registros: syncById,
      sync_count: (syncById || []).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});