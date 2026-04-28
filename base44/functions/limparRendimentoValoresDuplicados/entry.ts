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
  const dry_run = body.dry_run !== false; // default: dry_run=true para segurança

  let query = supabase
    .from('produto_rendimento_valores')
    .select('id, produto_id, rendimento_id, vinculo_id, valor, sincronizado, updated_at, deleted_at')
    .is('deleted_at', null);

  if (empresa_id) query = query.eq('empresa_id', empresa_id);

  const { data: rows, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Agrupa por chave exata (produto_id + rendimento_id + vinculo_id)
  const grupos = {};
  for (const r of rows) {
    const chave = `${r.produto_id}|${r.rendimento_id}|${r.vinculo_id ?? 'null'}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(r);
  }

  const idsParaDeletar = [];
  const resumo = [];

  for (const [chave, itens] of Object.entries(grupos)) {
    if (itens.length <= 1) continue;

    // Mantém o mais recente (maior updated_at)
    itens.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const manter = itens[0];
    const deletar = itens.slice(1).map(i => i.id);

    idsParaDeletar.push(...deletar);
    resumo.push({
      chave,
      mantendo_id: manter.id,
      mantendo_valor: manter.valor,
      mantendo_updated_at: manter.updated_at,
      deletando: deletar,
    });
  }

  if (dry_run) {
    return Response.json({
      dry_run: true,
      total_a_deletar: idsParaDeletar.length,
      grupos_duplicados: resumo.length,
      resumo,
    });
  }

  // Executa a limpeza: soft-delete nos duplicados
  if (idsParaDeletar.length > 0) {
    const now = new Date().toISOString();
    const { error: delError } = await supabase
      .from('produto_rendimento_valores')
      .update({ deleted_at: now })
      .in('id', idsParaDeletar);

    if (delError) return Response.json({ error: delError.message }, { status: 500 });
  }

  // Tenta adicionar constraint UNIQUE se ainda não existir
  let constraintMsg = null;
  try {
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'uq_rendimento_valor_produto_rend_vinculo'
          ) THEN
            ALTER TABLE produto_rendimento_valores
            ADD CONSTRAINT uq_rendimento_valor_produto_rend_vinculo
            UNIQUE (produto_id, rendimento_id, vinculo_id);
          END IF;
        END $$;
      `
    });
    constraintMsg = constraintError ? `Constraint não adicionada: ${constraintError.message}` : 'Constraint UNIQUE adicionada com sucesso.';
  } catch (e) {
    constraintMsg = `exec_sql não disponível: ${e.message}. Adicione manualmente via SQL.`;
  }

  return Response.json({
    dry_run: false,
    deletados: idsParaDeletar.length,
    grupos_limpos: resumo.length,
    constraint: constraintMsg,
    resumo,
  });
});