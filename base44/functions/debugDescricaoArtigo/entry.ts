import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase
    .from('tabela_precos_sync')
    .select('id, codigo_produto, nome_produto, num_composicoes, descricao_artigo')
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const resultado = data.map(r => ({
    codigo_produto: r.codigo_produto,
    nome_produto: r.nome_produto,
    num_composicoes: r.num_composicoes,
    descricao_artigo: r.descricao_artigo,
    tipo: typeof r.descricao_artigo,
    is_null: r.descricao_artigo === null,
  }));

  return Response.json({ total: data.length, registros: resultado });
});