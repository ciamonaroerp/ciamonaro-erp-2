/**
 * Hook para cálculo de parcelas com rateio correto.
 * Lógica migrada para o frontend — sem dependência de backend.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { formatarDataDDMMAA } from '@/utils/dateFormat';

function calcularParcelasLocalmente(simulacao, parcelasEditadas = []) {
  const { valor_financiamento, num_parcelas, taxa_juros = 0, data_primeiro_vencimento } = simulacao;
  const taxa = (taxa_juros || 0) / 100;
  const valorBase = valor_financiamento / num_parcelas;
  const parcelas = [];
  let somaBase = 0;

  for (let i = 0; i < num_parcelas; i++) {
    const editada = parcelasEditadas.find(p => p.indice === i);
    const base = editada?.valor_base ?? (i === num_parcelas - 1
      ? parseFloat((valor_financiamento - somaBase).toFixed(2))
      : parseFloat(valorBase.toFixed(2)));

    const dataBase = new Date(data_primeiro_vencimento);
    dataBase.setMonth(dataBase.getMonth() + i);
    const dataParcela = editada?.data_parcela || dataBase.toISOString().split('T')[0];

    const juros = parseFloat((base * taxa).toFixed(2));
    somaBase += base;

    parcelas.push({
      indice: i,
      numero: i + 1,
      valor_base: base,
      juros,
      valor_total: parseFloat((base + juros).toFixed(2)),
      data_parcela: dataParcela,
    });
  }

  const somaTotal = parcelas.reduce((acc, p) => acc + p.valor_total, 0);
  return { parcelas, somaBase, somaTotal };
}

export function useCalcularFinanciamento() {
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const calcularParcelas = useCallback(async (simulacao, parcelasEditadas = []) => {
    setLoading(true);
    setErro(null);
    try {
      const { parcelas: parcs, somaBase, somaTotal } = calcularParcelasLocalmente(simulacao, parcelasEditadas);

      const parcelasFormatadas = parcs.map((p) => ({
        ...p,
        data_parcela_formatada: formatarDataDDMMAA(p.data_parcela),
      }));

      setParcelas(parcelasFormatadas);
      return { parcelas: parcelasFormatadas, somaBase, somaTotal };
    } catch (err) {
      const mensagem = err.message || 'Erro ao calcular parcelas';
      setErro(mensagem);
      return { parcelas: [], erro: mensagem };
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizarParcelaERecalcular = useCallback(
    async (indice, novoValorBase, novaData, simulacao, parcelasAtuais) => {
      const parcelasEditadas = [...parcelasAtuais];
      const existente = parcelasEditadas.find(p => p.indice === indice);
      if (existente) {
        existente.valor_base = novoValorBase;
        existente.data_parcela = novaData;
      } else {
        parcelasEditadas.push({ indice, valor_base: novoValorBase, data_parcela: novaData });
      }
      return await calcularParcelas(simulacao, parcelasEditadas);
    },
    [calcularParcelas]
  );

  const salvarParcelasNoBanco = useCallback(async (simulacaoId, parcelasParaSalvar) => {
    if (!supabase) return { sucesso: false, erro: 'Supabase não inicializado.' };
    setLoading(true);
    setErro(null);
    try {
      await supabase.from('financiamento_parcelas').delete().eq('simulacao_id', simulacaoId);
      const rows = parcelasParaSalvar.map(p => ({ ...p, simulacao_id: simulacaoId }));
      const { error } = await supabase.from('financiamento_parcelas').insert(rows);
      if (error) throw new Error(error.message);
      return { sucesso: true, mensagem: 'Parcelas salvas com sucesso.' };
    } catch (err) {
      const mensagem = err.message || 'Erro ao salvar parcelas';
      setErro(mensagem);
      return { sucesso: false, erro: mensagem };
    } finally {
      setLoading(false);
    }
  }, []);

  return { parcelas, setParcelas, loading, erro, calcularParcelas, atualizarParcelaERecalcular, salvarParcelasNoBanco };
}