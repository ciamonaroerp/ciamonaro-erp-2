import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
import jsPDF from "jspdf";
import { supabase } from "@/components/lib/supabaseClient";

function formatMoeda(valor) {
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (!num && num !== 0) return "0,00";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(dataISO) {
  if (!dataISO) return "—";
  const data = new Date(dataISO + "T00:00:00");
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default function ModalVisualizarSimulacao({ simulacao, parcelas, open, onClose }) {
  if (!simulacao) return null;

  const totalJuros = (parcelas || []).reduce((s, p) => s + (parseFloat(p.juros) || 0), 0);
  const totalGeral = (parcelas || []).reduce((s, p) => s + (parseFloat(p.valor_parcela || p.total) || 0), 0);

  const handleGerarPDF = async () => {
    const doc = new jsPDF();

    // Posições das colunas
    // Parc | Data | Dias | [R$] [valor_base] | [R$] [juros] | [R$] [total]
    const COL = { parc: 14, data: 26, dias: 68, base_rs: 82, base_val: 112, juros_rs: 116, juros_val: 146, tot_rs: 150, tot_val: 193 };
    const ROW_H = 7;

    // ── Cabeçalho ─────────────────────────────────────────────────────────
    doc.setFontSize(15);
    doc.setFont("courier", "bold");
    doc.text("CIAMONARO ERP", 105, 14, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("Simulacao de Financiamento", 105, 20, { align: "center" });

    doc.setDrawColor(59, 92, 204);
    doc.setLineWidth(0.8);
    doc.line(14, 24, 196, 24);

    let y = 32;
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.text(`Codigo : #${String(simulacao.codigo_sequencial || 0).padStart(3, "0")}`, 14, y);
    doc.text(`Emitido: ${new Date().toLocaleDateString("pt-BR")}`, 196, y, { align: "right" });
    y += 7;

    // ── Dados da simulação ────────────────────────────────────────────────
    doc.setFont("courier", "bold");
    doc.text("DADOS DA SIMULACAO", 14, y); y += 5;
    doc.setLineWidth(0.3); doc.setDrawColor(180); doc.line(14, y, 196, y); y += 5;
    doc.setFont("courier", "normal");

    const dadosLinha1 = [
      [`Financiamento`, `R$  ${formatMoeda(simulacao.valor_financiamento)}`],
      [`Entrada       `, `R$  ${formatMoeda(simulacao.valor_entrada)}`],
    ];
    const dadosLinha2 = [
      [`Taxa Mensal   `, `${simulacao.taxa_juros_mensal}%`],
      [`Parcelas      `, `${simulacao.numero_parcelas}x`],
      [`Data Base     `, `${formatarData(simulacao.data_base)}`],
    ];

    dadosLinha1.forEach(([label, val], i) => {
      doc.setFont("courier", "bold"); doc.text(label, 14 + i * 92, y);
      doc.setFont("courier", "normal"); doc.text(val, 14 + i * 92 + 32, y);
    });
    y += 6;
    dadosLinha2.forEach(([label, val], i) => {
      doc.setFont("courier", "bold"); doc.text(label, 14 + i * 61, y);
      doc.setFont("courier", "normal"); doc.text(val, 14 + i * 61 + 32, y);
    });
    y += 10;

    // ── Cabeçalho da tabela ───────────────────────────────────────────────
    const isPrice = simulacao.tipo_parcelamento === "fixa";
    const COL_P = { parc: 14, data: 26, col3_val: 86, juros_rs: 90, juros_val: 130, tot_rs: 134, tot_val: 168, saldo_rs: 172, saldo_val: 196 };

    doc.setFillColor(59, 92, 204);
    doc.rect(14, y - 5, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text("PARC", COL.parc, y);
    doc.text("DATA", COL.data + 2, y);
    if (isPrice) {
      doc.text("AMORTIZACAO", COL_P.col3_val, y, { align: "right" });
      doc.text("JUROS", COL_P.juros_val, y, { align: "right" });
      doc.text("TOTAL (PMT)", COL_P.tot_val, y, { align: "right" });
      doc.text("SALDO", COL_P.saldo_val, y, { align: "right" });
    } else {
      doc.text("DIAS", COL.dias, y, { align: "right" });
      doc.text("VALOR BASE", COL.base_val, y, { align: "right" });
      doc.text("JUROS", COL.juros_val, y, { align: "right" });
      doc.text("TOTAL", COL.tot_val, y, { align: "right" });
    }
    y += ROW_H;

    // ── Linhas de parcelas ────────────────────────────────────────────────
    doc.setTextColor(0, 0, 0);
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);

    (parcelas || []).forEach((p, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(245, 247, 251); doc.rect(14, y - 4.5, 182, ROW_H, "F"); }

      const vBase = parseFloat(p.valor_base || p.valorBase || 0);
      const vJuros = parseFloat(p.juros || 0);
      const vTotal = parseFloat(p.valor_parcela || p.total || 0);
      const vSaldo = parseFloat(p.saldo_restante || p.saldo || 0);
      const numParcela = String(p.numero || (p.indice != null ? p.indice + 1 : idx + 1)).padStart(2, "0");
      const dataParc = formatarData(p.data_parcela || p.data);
      const dias = String(p.dias_decorridos || p.dias || 0);

      doc.setFont("courier", "bold");
      doc.text(numParcela, COL.parc, y);
      doc.setFont("courier", "normal");
      doc.text(dataParc, COL.data, y);

      if (isPrice) {
        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.col3_val - 14, y);
        doc.setTextColor(0, 0, 0);       doc.text(formatMoeda(vBase), COL_P.col3_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.juros_rs, y);
        doc.setTextColor(180, 80, 0);    doc.text(formatMoeda(vJuros), COL_P.juros_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.tot_rs, y);
        doc.setFont("courier", "bold");
        doc.setTextColor(30, 60, 180);   doc.text(formatMoeda(vTotal), COL_P.tot_val, y, { align: "right" });

        doc.setFont("courier", "normal");
        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.saldo_rs, y);
        doc.setTextColor(80, 80, 80);    doc.text(formatMoeda(vSaldo), COL_P.saldo_val, y, { align: "right" });
      } else {
        doc.setTextColor(0, 0, 0); doc.text(dias, COL.dias, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL.base_rs, y);
        doc.setTextColor(0, 0, 0);       doc.text(formatMoeda(vBase), COL.base_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL.juros_rs, y);
        doc.setTextColor(180, 80, 0);    doc.text(formatMoeda(vJuros), COL.juros_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL.tot_rs, y);
        doc.setFont("courier", "bold");
        doc.setTextColor(30, 60, 180);   doc.text(formatMoeda(vTotal), COL.tot_val, y, { align: "right" });
      }
      doc.setFont("courier", "normal"); doc.setTextColor(0, 0, 0);
      y += ROW_H;
    });

    // ── Linha de totais ───────────────────────────────────────────────────
    doc.setFillColor(30, 40, 80);
    doc.rect(14, y - 4.5, 182, ROW_H + 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text("TOTAL GERAL", COL.parc, y + 1);
    doc.text("R$", COL.juros_rs, y + 1);
    doc.text(formatMoeda(totalJuros), COL.juros_val, y + 1, { align: "right" });
    doc.text("R$", COL.tot_rs, y + 1);
    doc.text(formatMoeda(totalGeral), COL.tot_val, y + 1, { align: "right" });
    y += ROW_H + 6;

    // ── Rodapé ────────────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.setFont("courier", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")} — CIAMONARO ERP v1.0`, 105, 289, { align: "center" });
    doc.setTextColor(0, 0, 0);

    doc.save(`simulacao-${String(simulacao.codigo_sequencial || 0).padStart(3, "0")}.pdf`);

    try {
      await supabase.from("audit_logs").insert({ acao: "outro", entidade: "financiamento_simulacao", registro_id: simulacao.id, modulo: "Financeiro", dados_novos: JSON.stringify({ codigo_sequencial: simulacao.codigo_sequencial }) });
    } catch (_) {}
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-900">
              Simulação #{String(simulacao.codigo_sequencial || 0).padStart(3, "0")}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleGerarPDF} className="gap-2">
              <FileText className="h-4 w-4" /> Gerar PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Dados gerais */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 mt-2">
          <div>
            <p className="text-xs text-slate-500 font-medium">Valor do Financiamento</p>
            <p className="text-sm font-bold text-slate-900">R$ {formatMoeda(simulacao.valor_financiamento)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Valor da Entrada</p>
            <p className="text-sm font-bold text-slate-900">R$ {formatMoeda(simulacao.valor_entrada)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Taxa de Juros Mensal</p>
            <p className="text-sm font-bold text-slate-900">{simulacao.taxa_juros_mensal}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Número de Parcelas</p>
            <p className="text-sm font-bold text-slate-900">{simulacao.numero_parcelas}x</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Data Base</p>
            <p className="text-sm font-bold text-slate-900">{formatarData(simulacao.data_base)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Criado em</p>
            <p className="text-sm font-bold text-slate-900">
              {simulacao.created_at ? new Date(simulacao.created_at).toLocaleDateString("pt-BR") : "—"}
            </p>
          </div>
        </div>

        {/* Tabela de parcelas */}
        {parcelas && parcelas.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {["Parc.", "Data", "Dias", "Valor Base", "Juros", "Total"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p, idx) => (
                  <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                    <td className="px-3 py-2 font-mono font-bold text-slate-700">
                      {String(p.numero || p.indice + 1 || idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{formatarData(p.data_parcela || p.data)}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{p.dias_decorridos || p.dias || "—"}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">R$ {formatMoeda(p.valor_base || p.valorBase)}</td>
                    <td className="px-3 py-2 font-mono text-orange-600">R$ {formatMoeda(p.juros || 0)}</td>
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">R$ {formatMoeda(p.valor_parcela || p.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white">
                  <td colSpan={4} className="px-3 py-2.5 text-sm font-semibold">Total Geral</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-orange-300">R$ {formatMoeda(totalJuros)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold">R$ {formatMoeda(totalGeral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">Nenhuma parcela registrada para esta simulação.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}