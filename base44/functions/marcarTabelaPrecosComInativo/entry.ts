import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { empresa_id, codigo_produto, codigo_unico, produto_id, inativo } = body;

    if (!empresa_id || (!codigo_produto && !codigo_unico)) {
      return Response.json({ error: 'empresa_id e (codigo_produto ou codigo_unico) obrigatórios' }, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Marcar como inativo ou ativo (soft delete)
    let query = supabase
      .from('tabela_precos_sync')
      .update({
        status: inativo ? 'inativo' : 'ativo',
        updated_at: new Date().toISOString()
      })
      .eq('empresa_id', empresa_id);

    // Filtrar por codigo_unico se fornecido, caso contrário por codigo_produto
    // IMPORTANTE: quando filtrar por codigo_unico, sempre incluir produto_id para não afetar outros produtos
    if (codigo_unico) {
      query = query.eq('codigo_unico', codigo_unico);
      if (produto_id) {
        query = query.eq('produto_id', produto_id);
        console.log(`[marcarTabelaPrecosComInativo] Marcando codigo_unico: ${codigo_unico} produto_id: ${produto_id}`);
      } else {
        console.warn(`[marcarTabelaPrecosComInativo] AVISO: codigo_unico sem produto_id pode afetar múltiplos produtos!`);
        console.log(`[marcarTabelaPrecosComInativo] Marcando codigo_unico: ${codigo_unico}`);
      }
    } else if (codigo_produto) {
      query = query.eq('codigo_produto', codigo_produto);
      console.log(`[marcarTabelaPrecosComInativo] Marcando codigo_produto: ${codigo_produto}`);
    }

    const { data, error: updateError, count } = await query;

    if (updateError) {
      console.error('[marcarTabelaPrecosComInativo] Update error:', updateError.message);
      return Response.json({ error: updateError.message }, { status: 400 });
    }

    console.log(`[marcarTabelaPrecosComInativo] Linhas atualizadas: ${count}`);

    return Response.json({
      success: true,
      message: `Marcado como ${inativo ? 'inativo' : 'ativo'} (${count} registro(s))`,
      count
    });

  } catch (error) {
    console.error('[marcarTabelaPrecosComInativo] Exception:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});