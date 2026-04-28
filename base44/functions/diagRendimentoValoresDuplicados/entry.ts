import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const empresa_id = body.empresa_id;

  // Busca todos os registros ativos
  let query = supabase
    .from('produto_rendimento_valores')
    .select('id, produto_id, rendimento_id, vinculo_id, descricao_artigo, valor, sincronizado, updated_at')
    .is('deleted_at', null);

  if (empresa_id) query = query.eq('empresa_id', empresa_id);

  const { data: rows, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Agrupa por chave (produto_id + rendimento_id + vinculo_id) para detectar duplicatas
  const grupos = {};
  for (const r of rows) {
    const chave = `${r.produto_id}|${r.rendimento_id}|${r.vinculo_id ?? 'null'}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(r);
  }

  const duplicados = Object.entries(grupos)
    .filter(([, itens]) => itens.length > 1)
    .map(([chave, itens]) => ({
      chave,
      quantidade: itens.length,
      produto_id: itens[0].produto_id,
      rendimento_id: itens[0].rendimento_id,
      vinculo_id: itens[0].vinculo_id,
      descricao_artigo: itens[0].descricao_artigo,
      itens: itens.map(i => ({
        id: i.id,
        valor: i.valor,
        sincronizado: i.sincronizado,
        updated_at: i.updated_at,
      })),
    }));

  // Agrupa por (produto_id + rendimento_id) ignorando vinculo para detectar conflito entre vinculo_id vs descricao_artigo
  const gruposAlt = {};
  for (const r of rows) {
    const chave = `${r.produto_id}|${r.rendimento_id}`;
    if (!gruposAlt[chave]) gruposAlt[chave] = [];
    gruposAlt[chave].push(r);
  }

  const conflitosVinculo = Object.entries(gruposAlt)
    .filter(([, itens]) => itens.length > 1)
    .filter(([, itens]) => {
      const comVinculo = itens.filter(i => i.vinculo_id);
      const semVinculo = itens.filter(i => !i.vinculo_id);
      return comVinculo.length > 0 && semVinculo.length > 0;
    })
    .map(([chave, itens]) => ({
      chave,
      produto_id: itens[0].produto_id,
      rendimento_id: itens[0].rendimento_id,
      com_vinculo_id: itens.filter(i => i.vinculo_id).map(i => i.id),
      sem_vinculo_id: itens.filter(i => !i.vinculo_id).map(i => i.id),
    }));

  return Response.json({
    total_registros: rows.length,
    total_duplicados: duplicados.length,
    total_conflitos_vinculo: conflitosVinculo.length,
    duplicados,
    conflitos_vinculo: conflitosVinculo,
  });
});