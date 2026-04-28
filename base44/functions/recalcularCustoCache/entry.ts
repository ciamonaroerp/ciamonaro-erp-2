import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY'),
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  try {
    const reqForSdk = req.clone();
    const body = await req.json();
    const base44 = createClientFromRequest(reqForSdk);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { empresa_id, codigo_unico } = body;
    if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

    // Busca registros da tabela_precos_sync com custo_kg preenchido
    let query = supabase
      .from('tabela_precos_sync')
      .select('codigo_unico, empresa_id, custo_kg, custo_un, composicoes')
      .eq('empresa_id', empresa_id)
      .not('custo_kg', 'is', null);

    if (codigo_unico) query = query.eq('codigo_unico', codigo_unico);

    const { data: syncRows, error: syncErr } = await query;
    if (syncErr) return Response.json({ error: syncErr.message }, { status: 500 });

    let atualizados = 0;
    const erros = [];

    for (const row of (syncRows || [])) {
      // Recalcula consumo a partir das composicoes atuais (já corrigidas)
      let consumoTotal = 0;
      if (row.composicoes) {
        const composicoes = typeof row.composicoes === 'string'
          ? JSON.parse(row.composicoes)
          : row.composicoes;
        if (Array.isArray(composicoes)) {
          for (const item of composicoes) {
            consumoTotal += Number(item.valor_total) || 0;
          }
        }
      }

      const custoKg = Number(row.custo_kg) || 0;
      const custoUn = consumoTotal > 0 ? consumoTotal * custoKg : custoKg;

      // Recalcula custo_un na tabela_precos_sync também
      const { error: upSync } = await supabase
        .from('tabela_precos_sync')
        .update({ custo_un: custoUn })
        .eq('codigo_unico', row.codigo_unico)
        .eq('empresa_id', empresa_id);

      if (upSync) {
        erros.push({ codigo_unico: row.codigo_unico, erro: upSync.message });
        continue;
      }

      atualizados++;
      console.log(`[recalcularCustoCache] ${row.codigo_unico} → consumo: ${consumoTotal}, custo_un: ${custoUn}`);
    }

    return Response.json({ sucesso: true, atualizados, erros, total: syncRows?.length || 0 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});