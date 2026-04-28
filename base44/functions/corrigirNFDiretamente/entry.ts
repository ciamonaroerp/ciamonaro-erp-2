import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { empresa_id, numero_nf, ajustes } = body;

    if (!empresa_id || !numero_nf || !ajustes || !Array.isArray(ajustes)) {
      return Response.json({ error: 'Parâmetros obrigatórios: empresa_id, numero_nf, ajustes (array)' }, { status: 400 });
    }

    // Busca a nota fiscal
    const { data: nota, error: errNota } = await supabaseAdmin
      .from('nota_fiscal_importada')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('numero_nf', numero_nf)
      .single();

    if (errNota || !nota) {
      return Response.json({ error: 'Nota fiscal não encontrada' }, { status: 404 });
    }

    // Parse itens
    let itens = typeof nota.itens === 'string' ? JSON.parse(nota.itens) : nota.itens;
    if (!Array.isArray(itens)) itens = [];

    // Aplica ajustes
    for (const ajuste of ajustes) {
      const { indice, codigo_unico_novo } = ajuste;
      if (indice !== undefined && codigo_unico_novo) {
        if (indice >= 0 && indice < itens.length) {
          itens[indice].codigo_unico = codigo_unico_novo;
          itens[indice].status_vinculo = 'vinculado';
          console.log(`[Correção] Item ${indice}: atualizado para ${codigo_unico_novo}`);
        }
      }
    }

    // Atualiza a nota
    const { error: errUpdate } = await supabaseAdmin
      .from('nota_fiscal_importada')
      .update({ itens: JSON.stringify(itens) })
      .eq('id', nota.id);

    if (errUpdate) {
      return Response.json({ error: `Erro ao atualizar: ${errUpdate.message}` }, { status: 500 });
    }

    return Response.json({ success: true, itens_atualizados: ajustes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});