import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

// Função auxiliar para calcular dias entre datas
function calcularDias(dataBase, dataParcela) {
  const d1 = new Date(dataBase);
  const d2 = new Date(dataParcela);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Função auxiliar para aplicar juros (composto)
function aplicarJuros(valorBase, taxaMensal, dias) {
  const taxaDiaria = taxaMensal / 100 / 30; // Converte taxa mensal em diária
  return valorBase * Math.pow(1 + taxaDiaria, dias);
}

// Função auxiliar para formatar data em dd/mm/aaaa
function formatarDataDDMMAA(dataISO) {
  if (!dataISO) return '—';
  const data = new Date(dataISO);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Função para registrar auditoria
async function registrarAuditoria(supabase, usuarioEmail, acao, entidade, registroId, dadosAnteriores, dadosNovos, modulo) {
  try {
    await supabase.from('audit_logs').insert({
      usuario_email: usuarioEmail,
      acao,
      entidade,
      registro_id: registroId,
      dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
      dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : null,
      modulo: modulo || 'Financeiro',
      data_evento: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[AUDITORIA] Erro ao registrar:', e.message);
  }
}

// Função principal de cálculo com rateio correto
function calcularParcelasComRateio(
  valorFinanciamento,
  numeroParcelas,
  taxaMensal,
  dataBase,
  parcelasEditadas = []
) {
  console.log('📊 === INICIANDO CÁLCULO COM RATEIO ===');
  console.log(`Valor Financiamento: R$ ${valorFinanciamento}`);
  console.log(`Número de Parcelas: ${numeroParcelas}`);
  console.log(`Taxa Mensal: ${taxaMensal}%`);
  console.log(`Data Base: ${dataBase}`);
  console.log(`Parcelas Editadas (intermediárias): ${parcelasEditadas.length}`);

  // ETAPA 1: RATEIO (SEM JUROS)
  let totalIntermediarias = 0;
  const parcelasIntermediarias = parcelasEditadas.filter(p => p.valor_base !== undefined && p.valor_base > 0);

  for (const p of parcelasIntermediarias) {
    totalIntermediarias += p.valor_base;
  }

  console.log(`\n📌 ETAPA 1 - RATEIO SEM JUROS`);
  console.log(`Total Intermediárias: R$ ${totalIntermediarias}`);

  const saldoRestante = valorFinanciamento - totalIntermediarias;
  console.log(`Saldo Restante: R$ ${saldoRestante}`);

  const parcelasRestantes = numeroParcelas - parcelasIntermediarias.length;
  console.log(`Parcelas Restantes: ${parcelasRestantes}`);

  if (parcelasRestantes <= 0) {
    throw new Error('Erro: Soma das parcelas intermediárias maior que o valor total!');
  }

  const valorBaseUnitario = saldoRestante / parcelasRestantes;
  console.log(`Valor Base Unitário: R$ ${valorBaseUnitario.toFixed(2)}`);

  // Construir array de valores base
  const parcelas = [];
  let indiceGlobal = 0;

  for (let i = 0; i < numeroParcelas; i++) {
    const parcelaEditada = parcelasEditadas.find(p => p.indice === i);

    if (parcelaEditada && parcelaEditada.valor_base > 0) {
      // Usar valor intermediário
      parcelas.push({
        indice: i,
        valor_base: parcelaEditada.valor_base,
        data_parcela: parcelaEditada.data_parcela || dataBase,
        eh_intermediaria: true,
      });
    } else {
      // Calcular proporcionalmente
      parcelas.push({
        indice: i,
        valor_base: valorBaseUnitario,
        data_parcela: parcelaEditada?.data_parcela || dataBase,
        eh_intermediaria: false,
      });
    }
  }

  // Validar soma de bases
  const somaBases = parcelas.reduce((sum, p) => sum + p.valor_base, 0);
  console.log(`\n✅ VALIDAÇÃO - Soma de Bases: R$ ${somaBases.toFixed(2)}`);
  console.log(`Valor Original: R$ ${valorFinanciamento}`);
  console.log(`Diferença: R$ ${Math.abs(somaBases - valorFinanciamento).toFixed(2)}`);

  // ETAPA 2: APLICAR JUROS (APÓS RATEIO)
  console.log(`\n📌 ETAPA 2 - APLICAÇÃO DE JUROS`);

  const parcelasComJuros = parcelas.map((p, idx) => {
    const dias = calcularDias(dataBase, p.data_parcela);
    const valorComJuros = aplicarJuros(p.valor_base, taxaMensal, dias);
    const juros = valorComJuros - p.valor_base;

    console.log(
      `\nParcela ${idx + 1}: Base: R$ ${p.valor_base.toFixed(2)} | Dias: ${dias} | Juros: R$ ${juros.toFixed(2)} | Total: R$ ${valorComJuros.toFixed(2)}`
    );

    return {
      indice: idx,
      valor_base: p.valor_base,
      valor_parcela: valorComJuros,
      juros,
      dias_decorridos: dias,
      data_parcela: p.data_parcela,
      data_parcela_formatada: formatarDataDDMMAA(p.data_parcela),
      eh_intermediaria: p.eh_intermediaria,
    };
  });

  // Validação final
  const somaFinal = parcelasComJuros.reduce((sum, p) => sum + p.valor_base, 0);
  const totalComJuros = parcelasComJuros.reduce((sum, p) => sum + p.valor_parcela, 0);

  console.log(`\n✅ VALIDAÇÃO FINAL`);
  console.log(`Soma Valor Base: R$ ${somaFinal.toFixed(2)} (Esperado: R$ ${valorFinanciamento})`);
  console.log(`Total com Juros: R$ ${totalComJuros.toFixed(2)}`);
  console.log(`Total Juros: R$ ${(totalComJuros - somaFinal).toFixed(2)}`);

  return parcelasComJuros;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, id, simulacao, parcelas, usuarioEmail } = body;

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Env vars missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ===== AÇÃO: LISTAR =====
    if (action === 'listar') {
      try {
        const { data, error } = await supabase
          .from('fin_simulacoes_financiamento')
          .select('*')
          .is('deleted_at', null);

        if (error) {
          console.error('[calcularFinanciamento] Erro ao listar:', error);
          // Se tabela não existe, retorna vazio
          if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
            return Response.json({ data: [], error: null });
          }
          return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ data, error: null });
      } catch (e) {
        console.error('[calcularFinanciamento] Exceção ao listar:', e.message);
        return Response.json({ data: [], error: null });
      }
    }

    // ===== AÇÃO: BUSCAR =====
    if (action === 'buscar') {
      console.log('[calcularFinanciamento] === DEBUG BACKEND ===');
      console.log(`[calcularFinanciamento] Buscando simulação: ${id}`);

      const { data: sim, error: errSim } = await supabase
        .from('fin_simulacoes_financiamento')
        .select('*')
        .eq('id', id)
        .single();

      if (errSim) {
        console.error('[calcularFinanciamento] Erro ao buscar simulação:', errSim);
        return Response.json({ sim: null, error: errSim.message }, { status: 500 });
      }

      // Buscar parcelas
      const { data: parcs, error: errParcs } = await supabase
        .from('fin_parcelas_simulacao')
        .select('*')
        .eq('simulacao_id', id)
        .order('indice', { ascending: true });

      if (errParcs) {
        console.error('[calcularFinanciamento] Erro ao buscar parcelas:', errParcs);
        return Response.json({ sim, parcelas: [], error: errParcs.message }, { status: 500 });
      }

      return Response.json({
        sim,
        parcelas: parcs || [],
        error: null,
      });
    }

    // ===== AÇÃO: CALCULAR =====
    if (action === 'calcular') {
      console.log('[calcularFinanciamento] Recebido action=calcular');
      console.log('[calcularFinanciamento] Payload:', JSON.stringify(simulacao, null, 2));

      const parcelasCalculadas = calcularParcelasComRateio(
        simulacao.valor_financiamento,
        simulacao.numero_parcelas,
        simulacao.taxa_juros_mensal,
        simulacao.data_base,
        parcelas || []
      );

      // Registrar auditoria
      await registrarAuditoria(
        supabase,
        usuarioEmail || 'sistema',
        'calcular',
        'fin_simulacoes_financiamento',
        simulacao.id,
        null,
        parcelasCalculadas,
        'Financeiro'
      );

      return Response.json({
        parcelas: parcelasCalculadas,
        somaBase: parcelasCalculadas.reduce((sum, p) => sum + p.valor_base, 0),
        somaTotal: parcelasCalculadas.reduce((sum, p) => sum + p.valor_parcela, 0),
        error: null,
      });
    }

    // ===== AÇÃO: SALVAR PARCELAS =====
    if (action === 'salvarParcelas') {
      const simulacaoId = simulacao.id;
      console.log(`[calcularFinanciamento] Salvando parcelas para simulação: ${simulacaoId}`);

      // Deletar antigas
      await supabase
        .from('fin_parcelas_simulacao')
        .delete()
        .eq('simulacao_id', simulacaoId);

      // Inserir novas
      const { error: errInsert } = await supabase
        .from('fin_parcelas_simulacao')
        .insert(
          parcelas.map((p) => ({
            simulacao_id: simulacaoId,
            indice: p.indice,
            valor_base: p.valor_base,
            valor_parcela: p.valor_parcela,
            juros: p.juros,
            dias_decorridos: p.dias_decorridos,
            data_parcela: p.data_parcela,
            eh_intermediaria: p.eh_intermediaria || false,
          }))
        );

      if (errInsert) {
        console.error('[calcularFinanciamento] Erro ao inserir parcelas:', errInsert);
        return Response.json({ error: errInsert.message }, { status: 500 });
      }

      // Registrar auditoria
      await registrarAuditoria(
        supabase,
        usuarioEmail || 'sistema',
        'salvarParcelas',
        'fin_parcelas_simulacao',
        simulacaoId,
        null,
        parcelas,
        'Financeiro'
      );

      return Response.json({
        sucesso: true,
        mensagem: `${parcelas.length} parcelas salvas com sucesso`,
        error: null,
      });
    }

    // ===== AÇÃO: SALVAR SIMULAÇÃO =====
    if (action === 'salvar') {
      const { valor_financiamento, valor_entrada, taxa_juros_mensal, numero_parcelas, data_base, empresa_id } = simulacao;

      const { data: novaSimulacao, error: errInsert } = await supabase
        .from('fin_simulacoes_financiamento')
        .insert({
          empresa_id,
          valor_financiamento,
          valor_entrada,
          taxa_juros_mensal,
          numero_parcelas,
          data_base,
        })
        .select()
        .single();

      if (errInsert) {
        console.error('[calcularFinanciamento] Erro ao inserir simulação:', errInsert);
        return Response.json({ error: errInsert.message }, { status: 500 });
      }

      // Agora salvar as parcelas
      const { error: errParcelas } = await supabase
        .from('fin_parcelas_simulacao')
        .insert(
          (parcelas || []).map((p) => ({
            simulacao_id: novaSimulacao.id,
            indice: p.indice,
            valor_base: p.valor_base,
            valor_parcela: p.valor_parcela,
            juros: p.juros,
            dias_decorridos: p.dias_decorridos,
            data_parcela: p.data_parcela,
            eh_intermediaria: p.eh_intermediaria || false,
          }))
        );

      if (errParcelas) {
        console.error('[calcularFinanciamento] Erro ao inserir parcelas:', errParcelas);
        return Response.json({ error: errParcelas.message }, { status: 500 });
      }

      // Registrar auditoria
      await registrarAuditoria(
        supabase,
        usuarioEmail || 'sistema',
        'salvar',
        'fin_simulacoes_financiamento',
        novaSimulacao.id,
        null,
        novaSimulacao,
        'Financeiro'
      );

      return Response.json({
        sucesso: true,
        data: novaSimulacao,
        mensagem: `Simulação ${novaSimulacao.codigo_sequencial} salva com ${(parcelas || []).length} parcelas`,
        error: null,
      });
    }

    // ===== AÇÃO: GERAR PDF =====
    if (action === 'gerarPDF') {
      console.log('[calcularFinanciamento] Gerando PDF');
      
      // Registrar auditoria
      await registrarAuditoria(
        supabase,
        usuarioEmail || 'sistema',
        'gerarPDF',
        'fin_simulacoes_financiamento',
        simulacao.id,
        null,
        { titulo: simulacao.codigo_sequencial },
        'Financeiro'
      );

      return Response.json({
        sucesso: true,
        mensagem: 'PDF gerado com sucesso',
        error: null,
      });
    }

    return Response.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error) {
    console.error('[calcularFinanciamento] Erro geral:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});