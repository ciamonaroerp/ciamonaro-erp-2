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

    const { action, empresa_id, codigo_unico, produto_id, custo_kg_novo } = body;

    // ── APROVAR: Calcula custo_un no backend e persiste no cache ──
    if (action === 'aprovar') {
      if (!custo_kg_novo) {
        return Response.json({ sucesso: false, erro: 'custo_kg_novo é obrigatório' }, { status: 400 });
      }
      if (!codigo_unico && !produto_id) {
        return Response.json({ sucesso: false, erro: 'codigo_unico ou produto_id são obrigatórios' }, { status: 400 });
      }

      // Busca o registro — por codigo_unico (com artigo) ou produto_id (sem artigo)
      let syncQuery = supabase
        .from('tabela_precos_sync')
        .select('id, empresa_id, produto_id, consumo_un, composicoes')
        .order('sincronizado_em', { ascending: false })
        .limit(1);

      if (codigo_unico) {
        syncQuery = syncQuery.eq('codigo_unico', codigo_unico);
      } else {
        syncQuery = syncQuery.eq('produto_id', produto_id).is('codigo_unico', null);
      }

      const { data: syncRows, error: syncErr } = await syncQuery.single();

      if (syncErr || !syncRows) {
        return Response.json({ sucesso: false, erro: 'registro não encontrado' }, { status: 404 });
      }

      const custoKg = Number(custo_kg_novo);

      // Consumo obtido da tabela_precos_sync (já calculado na sincronização)
      const consumoTotal = Number(syncRows.consumo_un) || 0;
      
      // Cálculo obrigatório: custo_un = consumo_un * custo_kg
      const custoUn = consumoTotal > 0 ? consumoTotal * custoKg : custoKg;

      // Atualiza tabela_precos_sync
      const agora = new Date().toISOString();
      let upQuery = supabase.from('tabela_precos_sync').update({ custo_kg: custoKg, custo_un: custoUn, sincronizado_em: agora });
      if (codigo_unico) {
        upQuery = upQuery.eq('codigo_unico', codigo_unico);
      } else {
        upQuery = upQuery.eq('id', syncRows.id);
      }
      const { error: upErr } = await upQuery;

      if (upErr) {
        return Response.json({ sucesso: false, erro: upErr.message }, { status: 500 });
      }

      console.log('[aprovarCustoKg] Aprovado:', codigo_unico || produto_id, 'custo_kg:', custoKg, 'consumo:', consumoTotal, 'custo_un:', custoUn);
      return Response.json({ sucesso: true, codigo_unico: codigo_unico || null, produto_id: syncRows.produto_id, custo_kg: custoKg, consumo_total: consumoTotal, custo_un: custoUn });
    }

    // ── GET: Leitura direta da tabela_precos_sync ──
    if (action === 'get_custos') {
      if (!empresa_id) return Response.json({ data: {} });

      const { data, error } = await supabase
        .from('tabela_precos_sync')
        .select('codigo_unico, produto_id, custo_kg, custo_un, consumo_un')
        .eq('empresa_id', empresa_id)
        .not('custo_kg', 'is', null);

      if (error || !data || data.length === 0) return Response.json({ data: {} });

      const mapa = {};
      for (const row of data) {
        const key = row.codigo_unico || `pid:${row.produto_id}`;
        mapa[key] = { custo_kg: row.custo_kg, custo_un: row.custo_un, consumo: row.consumo_un };
      }

      return Response.json({ data: mapa });
    }

    return Response.json({ error: 'action inválida' }, { status: 400 });

  } catch (err) {
    console.error('[aprovarCustoKg] ERRO:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});