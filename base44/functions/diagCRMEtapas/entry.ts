import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('VITE_SUPABASE_ANON_KEY')
  );

  const { data: payload } = await req.json().catch(() => ({ data: {} }));
  const empresa_id = payload?.empresa_id;

  // Buscar funis
  const { data: funis } = await supabase
    .from('crm_funis')
    .select('id, nome, empresa_id')
    .is('deleted_at', null);

  // Buscar etapas
  let etapasQuery = supabase
    .from('crm_etapas')
    .select('id, nome, funil_id, empresa_id, deleted_at')
    .order('ordem');
  if (empresa_id) etapasQuery = etapasQuery.eq('empresa_id', empresa_id);
  const { data: etapas } = await etapasQuery;

  // Buscar oportunidades
  let opQuery = supabase
    .from('crm_oportunidades')
    .select('id, titulo, etapa_id, empresa_id, status')
    .is('deleted_at', null)
    .limit(50);
  if (empresa_id) opQuery = opQuery.eq('empresa_id', empresa_id);
  const { data: oportunidades } = await opQuery;

  // Identificar problema
  const etapaIdsAtivos = new Set((etapas || []).filter(e => !e.deleted_at).map(e => e.id));
  const semEtapa = (oportunidades || []).filter(o => !o.etapa_id || !etapaIdsAtivos.has(o.etapa_id));
  const comEtapa = (oportunidades || []).filter(o => o.etapa_id && etapaIdsAtivos.has(o.etapa_id));

  return Response.json({
    funis: funis || [],
    etapas_ativas: (etapas || []).filter(e => !e.deleted_at),
    etapas_deletadas: (etapas || []).filter(e => e.deleted_at),
    total_oportunidades: (oportunidades || []).length,
    oportunidades_com_etapa_valida: comEtapa.length,
    oportunidades_sem_etapa_valida: semEtapa.length,
    detalhe_sem_etapa: semEtapa.map(o => ({
      id: o.id,
      titulo: o.titulo,
      etapa_id: o.etapa_id,
      empresa_id: o.empresa_id,
    })),
    etapa_ids_validos: [...etapaIdsAtivos],
  });
});