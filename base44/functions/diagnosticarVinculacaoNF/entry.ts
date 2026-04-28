import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { empresa_id, numero_nf } = await req.json();
  if (!empresa_id || !numero_nf) {
    return Response.json({ error: 'empresa_id e numero_nf obrigatórios' }, { status: 400 });
  }

  // 1. Buscar a nota fiscal
  const { data: nota } = await supabase
    .from('nota_fiscal_importada')
    .select('*')
    .eq('empresa_id', empresa_id)
    .eq('numero_nf', numero_nf)
    .single();

  if (!nota) {
    return Response.json({ error: 'NF não encontrada' }, { status: 404 });
  }

  // 2. Parse dos itens
  let itens = nota.itens;
  if (typeof itens === 'string') {
    try { itens = JSON.parse(itens); } catch { itens = []; }
  }

  // 3. Buscar config_vinculos
  const { data: vinculos } = await supabase
    .from('config_vinculos')
    .select('codigo_unico, descricao_base, descricao_complementar, descricao_unificada, descricao_comercial_unificada, fornecedor_id')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  const normCNPJ = (s) => (s || '').replace(/\D/g, '');
  const emitenteCnpj = normCNPJ(nota.emitente_cnpj);

  // 4. Análise detalhada
  const diagnostico = {
    numero_nf: nota.numero_nf,
    emitente_cnpj: nota.emitente_cnpj,
    emitente_cnpj_normalizado: emitenteCnpj,
    total_itens: itens.length,
    config_vinculos_total: vinculos.length,
    itens_detalhados: []
  };

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    const itemDesc = `${item.descricao_complementar || ''} ${item.descricao_base || ''}`.toLowerCase().trim();

    // Buscar qual vinculo foi/deveria ser usado
    const vinculosComercial = vinculos.filter(v =>
      v.descricao_comercial_unificada &&
      v.descricao_comercial_unificada.toLowerCase() === itemDesc &&
      (!v.fornecedor_id || normCNPJ(v.fornecedor_id) === emitenteCnpj)
    );

    const vinculosUnificada = vinculos.filter(v =>
      v.descricao_unificada &&
      v.descricao_unificada.toLowerCase() === itemDesc &&
      (!v.fornecedor_id || normCNPJ(v.fornecedor_id) === emitenteCnpj)
    );

    diagnostico.itens_detalhados.push({
      numero_item: i + 1,
      descricao_base: item.descricao_base,
      descricao_complementar: item.descricao_complementar,
      descricao_unificada_item: itemDesc,
      codigo_unico_salvo: item.codigo_unico || 'NÃO VINCULADO',
      quantidade: item.quantidade,
      matches_comercial_unificada: vinculosComercial.map(v => ({ codigo_unico: v.codigo_unico, descricao_comercial_unificada: v.descricao_comercial_unificada })),
      matches_unificada: vinculosUnificada.map(v => ({ codigo_unico: v.codigo_unico, descricao_unificada: v.descricao_unificada }))
    });
  }

  return Response.json(diagnostico);
});