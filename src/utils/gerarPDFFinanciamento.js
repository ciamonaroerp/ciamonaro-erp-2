/**
 * Gerador de PDF para Simulações de Financiamento
 * Garante datas em dd/mm/aaaa e consistência com tela
 */

import jsPDF from 'jspdf';
import { formatarDataDDMMAA, formatarDataHora } from './dateFormat';

function formatarMoedaBR(valor) {
  if (!valor && valor !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function gerarPDFSimulacao(simulacao, parcelas = []) {
  try {
    console.log('[PDF] Iniciando geração com simulação:', simulacao.codigo_sequencial);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const lineHeight = 8;
    let yPos = margin;

    // Cores
    const corPrincipal = [59, 92, 204]; // #3B5CCC
    const corTexto = [0, 0, 0];
    const corSubtitulo = [100, 100, 100];

    // ===== CABEÇALHO =====
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...corPrincipal);
    doc.text('SIMULAÇÃO DE FINANCIAMENTO', margin, yPos);
    yPos += 10;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...corSubtitulo);
    doc.text(`Código: #${String(simulacao.codigo_sequencial || 0).padStart(3, '0')}`, margin, yPos);
    yPos += lineHeight;

    // ===== DADOS PRINCIPAIS =====
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...corPrincipal);
    doc.text('DADOS DA SIMULAÇÃO', margin, yPos);
    yPos += 8;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...corTexto);

    const dados = [
      ['Valor Financiado:', formatarMoedaBR(simulacao.valor_financiamento)],
      ['Valor Entrada:', formatarMoedaBR(simulacao.valor_entrada)],
      ['Taxa Mensal:', `${simulacao.taxa_juros_mensal}%`],
      ['Número Parcelas:', `${simulacao.numero_parcelas}x`],
      ['Data Base:', formatarDataDDMMAA(simulacao.data_base)],
      ['Criado em:', formatarDataHora(simulacao.created_at)],
    ];

    for (const [label, valor] of dados) {
      doc.setFont('Helvetica', 'bold');
      doc.text(label, margin, yPos);
      doc.setFont('Helvetica', 'normal');
      doc.text(valor, margin + 60, yPos);
      yPos += lineHeight;
    }

    // ===== TABELA DE PARCELAS =====
    yPos += 5;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...corPrincipal);
    doc.text('PARCELAS', margin, yPos);
    yPos += 8;

    // Cabeçalho da tabela
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(59, 92, 204);
    doc.setTextColor(255, 255, 255);

    const colWidth = (pageWidth - margin * 2) / 6;
    const headers = ['Parc.', 'Data', 'Valor Base', 'Juros', 'Valor Parcela', 'Dias'];

    for (let i = 0; i < headers.length; i++) {
      doc.rect(margin + i * colWidth, yPos - 5, colWidth, 7, 'F');
      const x = margin + i * colWidth + colWidth / 2;
      doc.text(headers[i], x, yPos, { align: 'center' });
    }

    yPos += 10;
    doc.setTextColor(...corTexto);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    let totalBase = 0;
    let totalParcelas = 0;
    let totalJuros = 0;

    for (let idx = 0; idx < parcelas.length; idx++) {
      const p = parcelas[idx];
      
      // Quebra de página se necessário
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }

      const valores = [
        String(idx + 1),
        formatarDataDDMMAA(p.data_parcela),
        formatarMoedaBR(p.valor_base),
        formatarMoedaBR(p.juros),
        formatarMoedaBR(p.valor_parcela),
        String(p.dias_decorridos || 0),
      ];

      for (let i = 0; i < valores.length; i++) {
        const x = margin + i * colWidth + colWidth / 2;
        const align = i === 0 ? 'center' : i === 1 ? 'center' : 'right';
        doc.text(valores[i], x, yPos, { align });
      }

      totalBase += p.valor_base || 0;
      totalJuros += p.juros || 0;
      totalParcelas += p.valor_parcela || 0;

      yPos += lineHeight;
    }

    // ===== TOTALIZADORES =====
    yPos += 3;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, 7, 'F');
    
    const totalValues = [
      `Total: ${formatarMoedaBR(totalBase)}`,
      `Juros: ${formatarMoedaBR(totalJuros)}`,
      `Líquido: ${formatarMoedaBR(totalParcelas)}`,
    ];

    let xTotal = margin + 5;
    for (const val of totalValues) {
      doc.text(val, xTotal, yPos, { align: 'left' });
      xTotal += (pageWidth - margin * 2) / 3;
    }

    // ===== RODAPÉ =====
    yPos += 15;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...corSubtitulo);
    doc.text(
      `Gerado em: ${formatarDataHora(new Date().toISOString())} | CIAMONARO ERP`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // ===== SALVAR =====
    const nomeArquivo = `Simulacao_${String(simulacao.codigo_sequencial || 0).padStart(3, '0')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nomeArquivo);

    console.log('[PDF] Gerado com sucesso:', nomeArquivo);
    return { sucesso: true, nomeArquivo };
  } catch (error) {
    console.error('[PDF] Erro ao gerar:', error);
    return { sucesso: false, erro: error.message };
  }
}