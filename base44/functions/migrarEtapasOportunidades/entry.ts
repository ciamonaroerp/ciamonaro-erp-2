import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

// Esta função diagnostica e opcionalmente corrige oportunidades com etapa_id inválido
// Ela tenta mapear pelo nome da etapa (ex: "Prospecção" → novo ID da etapa com mesmo nome)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('VITE_SUPABASE_ANON_KEY')
  );

  const body = await req.json().catch(() => ({}));
  const { empresa_id, executar = false } = body;

  if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

  // Buscar funil ativo da empresa
  const { data: funis } = await supabase
    .from('crm_funis')
    .select('id, nome')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null)
    .order('created_at')
    .limit(1);

  const funil = funis?.[0];
  if (!funil) return Response.json({ error: 'Nenhum funil encontrado' }, { status: 404 });

  // Buscar etapas ativas do funil
  const { data: etapasAtivas } = await supabase
    .from('crm_etapas')
    .select('id, nome, ordem')
    .eq('empresa_id', empresa_id)
    .eq('funil_id', funil.id)
    .is('deleted_at', null)
    .order('ordem');

  // Buscar TODAS as etapas (incluindo deletadas) para mapear IDs antigos → nomes
  const { data: todasEtapas } = await supabase
    .from('crm_etapas')
    .select('id, nome, deleted_at')
    .eq('empresa_id', empresa_id);

  // Mapa: id → nome (para todas as etapas)
  const mapaIdNome = {};
  (todasEtapas || []).forEach(e => { mapaIdNome[e.id] = e.nome; });

  // Mapa: nome_normalizado → id ativo (case insensitive)
  const mapaNomeAtivo = {};
  (etapasAtivas || []).forEach(e => {
    mapaNomeAtivo[e.nome.toLowerCase().trim()] = e.id;
  });

  // Buscar oportunidades sem etapa válida
  const etapaIdsAtivos = new Set((etapasAtivas || []).map(e => e.id));
  const { data: oportunidades } = await supabase
    .from('crm_oportunidades')
    .select('id, titulo, etapa_id')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  const semEtapaValida = (oportunidades || []).filter(
    o => !o.etapa_id || !etapaIdsAtivos.has(o.etapa_id)
  );

  // Para cada oportunidade sem etapa válida, tenta mapear pelo nome da etapa antiga
  const plano = semEtapaValida.map(op => {
    const nomeEtapaAntiga = op.etapa_id ? mapaIdNome[op.etapa_id] : null;
    const novoId = nomeEtapaAntiga
      ? mapaNomeAtivo[nomeEtapaAntiga.toLowerCase().trim()]
      : null;
    // Se não mapear pelo nome, usa a primeira etapa ativa
    const fallbackId = (etapasAtivas || [])[0]?.id || null;
    return {
      oportunidade_id: op.id,
      titulo: op.titulo,
      etapa_id_antigo: op.etapa_id,
      nome_etapa_antiga: nomeEtapaAntiga || '(sem etapa)',
      novo_etapa_id: novoId || fallbackId,
      acao: novoId ? 'mapeado_por_nome' : 'fallback_primeira_etapa',
    };
  });

  if (!executar) {
    return Response.json({
      funil,
      etapas_ativas: etapasAtivas,
      total_sem_etapa_valida: semEtapaValida.length,
      plano_migracao: plano,
      instrucao: 'Para executar, envie { empresa_id, executar: true }',
    });
  }

  // Executar a migração
  const resultados = [];
  for (const item of plano) {
    if (!item.novo_etapa_id) {
      resultados.push({ ...item, status: 'pulado_sem_destino' });
      continue;
    }
    const { error } = await supabase
      .from('crm_oportunidades')
      .update({ etapa_id: item.novo_etapa_id, updated_at: new Date().toISOString() })
      .eq('id', item.oportunidade_id);
    resultados.push({ ...item, status: error ? `erro: ${error.message}` : 'ok' });
  }

  return Response.json({
    funil,
    total_migrado: resultados.filter(r => r.status === 'ok').length,
    total_erro: resultados.filter(r => r.status !== 'ok').length,
    resultados,
  });
});