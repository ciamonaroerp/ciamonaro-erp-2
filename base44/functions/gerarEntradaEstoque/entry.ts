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

  const { empresa_id, nota_id, codigo_unico: filtro_codigo } = await req.json();
  if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

  const logs = [];
  let geradas = 0;
  let ignoradas = 0;
  let erros = 0;
  let pendentes = 0;

  // 1. Buscar depósito principal
  const { data: locais, error: errLocais } = await supabase
    .from('estoque_locais')
    .select('id, nome, tipo')
    .eq('empresa_id', empresa_id)
    .eq('tipo', 'DEPOSITO')
    .eq('ativo', true)
    .is('deleted_at', null)
    .limit(1);

  if (errLocais || !locais?.length) {
    return Response.json({
      error: 'Nenhum depósito principal encontrado. Cadastre um local do tipo DEPOSITO primeiro.',
    }, { status: 400 });
  }

  const deposito = locais[0];
  logs.push(`Depósito principal: ${deposito.nome} (${deposito.id})`);

  const normCNPJ = (s) => (s || '').replace(/\D/g, '');

  logs.push(`Iniciando geração de entradas de estoque...`);



  // 3. Buscar notas fiscais
  let query = supabase
    .from('nota_fiscal_importada')
    .select('id, numero_nf, itens, emitente_cnpj')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  if (nota_id) query = query.eq('id', nota_id);

  const { data: notas, error: errNotas } = await query;

  if (errNotas) {
    return Response.json({ error: `Erro ao buscar notas: ${errNotas.message}` }, { status: 500 });
  }

  if (!notas?.length) {
    return Response.json({ sucesso: true, logs: ['Nenhuma nota fiscal encontrada.'], geradas: 0, ignoradas: 0, erros: 0, pendentes: 0 });
  }

  logs.push(`Processando ${notas.length} nota(s)...`);

  // 4. Processar cada nota
  for (const nota of notas) {
    let itens = nota.itens;
    if (typeof itens === 'string') {
      try { itens = JSON.parse(itens); } catch { itens = []; }
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      logs.push(`NF ${nota.numero_nf || nota.id}: sem itens`);
      continue;
    }

    const emitenteCnpj = normCNPJ(nota.emitente_cnpj);

    for (let itemIdx = 0; itemIdx < itens.length; itemIdx++) {
      const item = itens[itemIdx];
      const numeroItem = item.numero_item ?? (itemIdx + 1);

      // ─── RESOLUÇÃO: usa apenas codigo_unico já gravado no item ───
      const cuValidado = item.codigo_unico || null;

      if (!cuValidado) {
        logs.push(`⚠ PENDENTE — NF ${nota.numero_nf || nota.id} item ${numeroItem}: "${item.descricao_base}" sem vínculo.`);
        pendentes++;
        ignoradas++;
        continue;
      }

      // Filtro opcional
      if (filtro_codigo && cuValidado !== filtro_codigo) continue;

      const qtd = parseFloat(item.quantidade) || 0;
      if (qtd <= 0) {
        logs.push(`NF ${nota.numero_nf} — ${cuValidado}: quantidade inválida (${item.quantidade})`);
        erros++;
        continue;
      }

      // ─── CHECK DUPLICIDADE ───
      const obsEsperada = `Entrada automática via XML — NF ${nota.numero_nf || nota.id} item ${numeroItem}`;

      const { data: existente } = await supabase
        .from('estoque_movimentacoes')
        .select('id')
        .eq('empresa_id', empresa_id)
        .eq('documento_id', nota.id)
        .eq('codigo_unico', cuValidado)
        .eq('tipo', 'ENTRADA_XML')
        .eq('observacao', obsEsperada)
        .is('deleted_at', null)
        .limit(1);

      if (existente?.length > 0) {
        logs.push(`NF ${nota.numero_nf} — ${cuValidado} item ${numeroItem}: já existe, ignorado`);
        ignoradas++;
        continue;
      }

      // ─── INSERIR MOVIMENTAÇÃO ───
      const { error: errInsert } = await supabase
        .from('estoque_movimentacoes')
        .insert({
          empresa_id,
          codigo_unico: cuValidado,
          tipo: 'ENTRADA_XML',
          quantidade: qtd,
          local_destino_id: deposito.id,
          local_origem_id: null,
          documento_origem: 'NF',
          documento_id: nota.id,
          observacao: obsEsperada,
        });

      if (errInsert) {
        logs.push(`ERRO ao inserir — ${cuValidado}: ${errInsert.message}`);
        erros++;
      } else {
        logs.push(`✓ ENTRADA — ${cuValidado} | Qtd: ${qtd} | NF: ${nota.numero_nf || nota.id} item ${numeroItem}`);
        geradas++;
      }
    }
  }

  return Response.json({ sucesso: true, geradas, ignoradas, erros, pendentes, logs });
});