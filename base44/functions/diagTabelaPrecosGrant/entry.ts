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

    // 1. Tenta ler da tabela
    const { data: rows, error: selectError } = await supabase
      .from('tabela_precos_sync')
      .select('id, codigo_produto, produto_id, tipo_produto, empresa_id')
      .eq('empresa_id', empresa_id)
      .limit(5);

    // 2. Tenta update em um registro existente
    let updateResult = null;
    if (rows && rows.length > 0) {
      const row = rows[0];
      const { data: upd, error: updError } = await supabase
        .from('tabela_precos_sync')
        .update({ tipo_produto: row.tipo_produto || 'simples' })
        .eq('id', row.id)
        .select('id, tipo_produto');
      updateResult = { data: upd, error: updError?.message };
    }

    // 3. Verifica colunas da tabela
    const { data: cols, error: colsError } = await supabase
      .rpc('get_table_columns', { table_name: 'tabela_precos_sync' })
      .select();

    return Response.json({
      select: { rows: rows?.slice(0, 3), error: selectError?.message },
      update: updateResult,
      colunas_rpc: { data: cols, error: colsError?.message },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});