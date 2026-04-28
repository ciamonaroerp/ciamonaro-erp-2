import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const empresa_id = body.empresa_id;

  // Passo 1: limpar todos os duplicados (incluindo soft-deleted)
  let query = supabaseAdmin
    .from('produto_rendimento_valores')
    .select('id, produto_id, rendimento_id, vinculo_id, valor, updated_at, deleted_at');

  if (empresa_id) query = query.eq('empresa_id', empresa_id);

  const { data: rows, error: fetchError } = await query;
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });

  // Agrupa por chave exata (produto_id + rendimento_id + vinculo_id)
  const grupos = {};
  for (const r of rows) {
    const chave = `${r.produto_id}|${r.rendimento_id}|${r.vinculo_id ?? 'null'}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(r);
  }

  const idsParaDeletar = [];

  for (const itens of Object.values(grupos)) {
    if (itens.length <= 1) continue;

    // Prioriza: não-deletado mais recente; se todos deletados, mantém o mais recente
    const naoDeleteados = itens.filter(i => !i.deleted_at);
    const candidatos = naoDeleteados.length > 0 ? naoDeleteados : itens;
    candidatos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const manter = candidatos[0];
    const deletar = itens.filter(i => i.id !== manter.id).map(i => i.id);
    idsParaDeletar.push(...deletar);
  }

  let deletados = 0;
  if (idsParaDeletar.length > 0) {
    const now = new Date().toISOString();
    const { error: delError } = await supabaseAdmin
      .from('produto_rendimento_valores')
      .update({ deleted_at: now })
      .in('id', idsParaDeletar);
    if (delError) return Response.json({ error: `Erro ao limpar duplicatas: ${delError.message}` }, { status: 500 });
    deletados = idsParaDeletar.length;
  }

  // Passo 2: informar o SQL para criar índice parcial (apenas registros ativos)
  const sqlIndex = `
-- Remove constraint antiga se existir
ALTER TABLE produto_rendimento_valores
  DROP CONSTRAINT IF EXISTS uq_rendimento_valor_produto_rend_vinculo;

-- Cria índice único PARCIAL (ignora soft-deleted e trata NULL em vinculo_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_rendimento_valor_ativo
  ON produto_rendimento_valores (produto_id, rendimento_id, COALESCE(vinculo_id::text, '__NULL__'))
  WHERE deleted_at IS NULL;
`.trim();

  return Response.json({
    success: true,
    duplicatas_removidas: deletados,
    grupos_com_duplicata: idsParaDeletar.length > 0 ? Object.values(grupos).filter(g => g.length > 1).length : 0,
    proximo_passo: 'Execute o SQL abaixo no Supabase SQL Editor para criar o índice único parcial:',
    sql: sqlIndex,
  });
});