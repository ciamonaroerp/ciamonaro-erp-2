import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    // Busca todos os registros com num_composicoes > 1 (qualquer valor de resumo_composicoes)
    const { data: rows, error } = await supabase
      .from('tabela_precos_sync')
      .select('id, num_composicoes, resumo_composicoes')
      .gt('num_composicoes', 1);

    if (error) throw new Error(error.message);

    let atualizados = 0;

    for (const row of (rows || [])) {
      // Pula se já tem resumo preenchido
      const jaTemResumo = Array.isArray(row.resumo_composicoes) && row.resumo_composicoes.length > 0;
      if (jaTemResumo) continue;

      const n = Number(row.num_composicoes);
      const resumo = Array.from({ length: n }, (_, i) => `Cor ${i + 1}`);

      const { error: upErr } = await supabase
        .from('tabela_precos_sync')
        .update({ resumo_composicoes: resumo })
        .eq('id', row.id);

      if (!upErr) atualizados++;
    }

    return Response.json({
      success: true,
      total_encontrados: (rows || []).length,
      total_atualizados: atualizados,
    });

  } catch (error) {
    console.error('Erro popularResumoComposicoes:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});