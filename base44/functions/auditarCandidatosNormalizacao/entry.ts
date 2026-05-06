import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await base44.supabase.rpc('get_candidate_tables', {
      threshold: 0.3  // Colunas com <30% valores únicos são candidatas
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Formata resultado legível
    const candidatos = (data || []).map(row => ({
      tabela: row.table_name,
      coluna: row.column_name,
      tipo: row.data_type,
      total_registros: row.total_rows,
      valores_unicos: row.unique_count,
      taxa_duplicacao: ((1 - (row.unique_count / row.total_rows)) * 100).toFixed(1) + '%',
      potencial: row.unique_count < 50 ? '🔥 Alto' : row.unique_count < 200 ? '⚠️ Médio' : '✅ Baixo'
    }))
    .sort((a, b) => parseFloat(b.taxa_duplicacao) - parseFloat(a.taxa_duplicacao));

    return Response.json({ 
      candidatos,
      total_encontrados: candidatos.length,
      recomendacao: 'Priorize as com taxa de duplicação > 70% e valores únicos < 50'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});