/**
 * Componente para formatação e exibição de parcelas
 * Garante consistência de datas em dd/mm/aaaa
 */

import { formatarDataDDMMAA } from '@/utils/dateFormat';

export function formatarMoedaBR(valor) {
  if (!valor && valor !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function formatarParcelas(parcelas = []) {
  return parcelas.map((p) => ({
    ...p,
    data_parcela_formatada: formatarDataDDMMAA(p.data_parcela),
    valor_base_formatado: formatarMoedaBR(p.valor_base),
    valor_parcela_formatado: formatarMoedaBR(p.valor_parcela),
    juros_formatado: formatarMoedaBR(p.juros),
  }));
}

export function gerarLinhaParcelaCSV(p, index) {
  return [
    index + 1,
    p.data_parcela_formatada || formatarDataDDMMAA(p.data_parcela),
    p.valor_base_formatado || formatarMoedaBR(p.valor_base),
    p.valor_parcela_formatado || formatarMoedaBR(p.valor_parcela),
    p.juros_formatado || formatarMoedaBR(p.juros),
    p.dias_decorridos || 0,
  ].join(',');
}

export function renderizarTabelaParcelas(parcelas = []) {
  const formatadas = formatarParcelas(parcelas);
  
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200">
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Parc.</th>
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Data</th>
          <th className="px-3 py-2 text-right font-semibold text-slate-700">Valor Base</th>
          <th className="px-3 py-2 text-right font-semibold text-slate-700">Juros</th>
          <th className="px-3 py-2 text-right font-semibold text-slate-700">Valor Parcela</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Dias</th>
        </tr>
      </thead>
      <tbody>
        {formatadas.map((p, idx) => (
          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="px-3 py-2 text-slate-600">{idx + 1}</td>
            <td className="px-3 py-2 font-mono text-slate-800">{p.data_parcela_formatada}</td>
            <td className="px-3 py-2 text-right text-slate-800">{p.valor_base_formatado}</td>
            <td className="px-3 py-2 text-right text-slate-600">{p.juros_formatado}</td>
            <td className="px-3 py-2 text-right font-semibold text-slate-900">{p.valor_parcela_formatado}</td>
            <td className="px-3 py-2 text-center text-slate-600">{p.dias_decorridos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}