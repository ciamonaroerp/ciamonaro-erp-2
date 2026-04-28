import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

// Mesma função de resolução do gerarEntradaEstoque
function resolverCodigoUnico(vinculos, descricaoBase, descricaoComplementar, emitenteCnpj) {
  const compItem = (descricaoComplementar || '').toLowerCase().replace(/_/g, ' ');
  const normCNPJ = (s) => (s || '').replace(/\D/g, '');
  const fornNorm = normCNPJ(emitenteCnpj);

  const vinculosForn = (vinculos || []).filter(v =>
    !v.fornecedor_id || normCNPJ(v.fornecedor_id) === fornNorm
  );

  if (compItem) {
    const palavrasIgnorar = new Set(['micro','solutio','tinto','amac','amaciante','com']);
    let melhorVinculo = null;
    let melhorScore = 0;
    for (const v of vinculosForn) {
      if (!v.descricao_base) continue;
      const kws = v.descricao_base.toLowerCase().split(/\s+/)
        .filter(kw => kw.length >= 4 && !palavrasIgnorar.has(kw));
      const hits = kws.filter(kw => compItem.includes(kw)).length;
      if (hits > melhorScore) {
        melhorScore = hits;
        melhorVinculo = v;
      }
    }
    if (melhorVinculo && melhorScore > 0) return melhorVinculo.codigo_unico;
  }

  const candidatos = vinculosForn.filter(v => v.descricao_base === descricaoBase);
  if (candidatos.length === 1) return candidatos[0].codigo_unico;
  return null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { empresa_id } = await req.json();
  if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

  const logs = [];

  // Carregar config_vinculos
  const { data: vinculos } = await supabase
    .from('config_vinculos')
    .select('id, codigo_unico, descricao_base, descricao_complementar, fornecedor_id')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  // Carregar notas
  const { data: notas } = await supabase
    .from('nota_fiscal_importada')
    .select('id, numero_nf, emitente_cnpj, itens')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  let notasAtualizadas = 0;
  let itensCorrigidos = 0;
  let itensPendentes = 0;

  for (const nota of (notas || [])) {
    let itens;
    try { itens = typeof nota.itens === 'string' ? JSON.parse(nota.itens) : nota.itens; } catch { continue; }
    if (!Array.isArray(itens)) continue;

    let changed = false;
    const novosItens = itens.map((item, idx) => {
      // Re-resolve o codigo_unico para cada item (inclusive os já vinculados)
      const cuCorreto = resolverCodigoUnico(vinculos, item.descricao_base, item.descricao_complementar, nota.emitente_cnpj);

      if (!cuCorreto) {
        // Não encontrou vínculo → pendente
        if (item.codigo_unico) {
          changed = true;
          itensPendentes++;
          logs.push(`↩ NF ${nota.numero_nf} item ${idx+1}: "${item.descricao_base}" → sem vínculo resolvível, reseta para pendente`);
          return { ...item, codigo_unico: null, status_vinculo: 'pendente_de_vinculo' };
        }
        return item;
      }

      if (item.codigo_unico !== cuCorreto) {
        changed = true;
        itensCorrigidos++;
        logs.push(`✓ NF ${nota.numero_nf} item ${idx+1}: "${item.descricao_base}" / "${item.descricao_complementar}" → ${item.codigo_unico || 'sem vínculo'} → CORRIGIDO para ${cuCorreto}`);
        return { ...item, codigo_unico: cuCorreto, status_vinculo: 'vinculado' };
      }

      return item;
    });

    if (changed) {
      await supabase
        .from('nota_fiscal_importada')
        .update({ itens: JSON.stringify(novosItens) })
        .eq('id', nota.id);
      notasAtualizadas++;

      // Apagar movimentações antigas ENTRADA_XML dessa nota para re-gerar
      await supabase
        .from('estoque_movimentacoes')
        .delete()
        .eq('empresa_id', empresa_id)
        .eq('documento_id', nota.id)
        .eq('tipo', 'ENTRADA_XML');

      logs.push(`🗑 Movimentações de estoque da NF ${nota.numero_nf} removidas para re-geração`);
    }
  }

  return Response.json({
    sucesso: true,
    notas_atualizadas: notasAtualizadas,
    itens_corrigidos: itensCorrigidos,
    itens_pendentes: itensPendentes,
    logs,
  });
});