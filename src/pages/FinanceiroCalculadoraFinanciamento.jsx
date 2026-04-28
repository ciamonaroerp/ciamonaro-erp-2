import React, { useState, useCallback } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Calculator, Save, FileText, ChevronLeft, RefreshCw, Eye } from "lucide-react";
import ErpTable from "@/components/erp/ErpTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import ModalVisualizarSimulacao from "@/components/financeiro/ModalVisualizarSimulacao";

const empresa_id = import.meta.env.VITE_EMPRESA_ID;

function formatMoeda(valor) {
  const num = typeof valor === "string" ? parseFloat(valor.replace(/\./g, "").replace(",", ".")) : valor;
  if (!num && num !== 0) return "0,00";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoeda(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}

function MoedaInput({ value, onChange, className, disabled, ...props }) {
  const [display, setDisplay] = useState(value !== undefined && value !== "" ? formatMoeda(value) : "");

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d,]/g, "");
    setDisplay(raw);
    onChange(parseMoeda(raw));
  };

  const handleBlur = () => {
    const num = parseMoeda(display);
    setDisplay(num ? formatMoeda(num) : "");
  };

  return (
    <Input
      {...props}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      autoComplete="off"
      disabled={disabled}
      className={className}
    />
  );
}

function calcularDias(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return 0;
  const d1 = new Date(dataInicio + "T00:00:00");
  const d2 = new Date(dataFim + "T00:00:00");
  const diff = d2 - d1;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function calcularJurosPorDias(valorBase, taxaMensal, dias) {
  if (!valorBase || !taxaMensal || !dias || dias <= 0) return 0;
  // Juros compostos: valor_parcela = valor_base * (1 + taxa)^(dias/30)
  // juros = valor_parcela - valor_base
  const fator = Math.pow(1 + taxaMensal / 100, dias / 30) - 1;
  return valorBase * fator;
}

function distribuirValorBase(parcelas, valorFinanciado) {
  if (!parcelas.length || !valorFinanciado) return parcelas;

  const intermediarias = parcelas.filter(p => p.isIntermediaria && p.valorEspecifico != null && p.valorEspecifico > 0);
  const normais = parcelas.filter(p => !(p.isIntermediaria && p.valorEspecifico != null && p.valorEspecifico > 0));

  const somaIntermediarias = intermediarias.reduce((acc, p) => acc + (p.valorEspecifico || 0), 0);

  if (somaIntermediarias > valorFinanciado + 0.01) {
    return parcelas; // retorna sem alterar, validação mostrará erro
  }

  const restante = valorFinanciado - somaIntermediarias;
  const valorDistribuido = normais.length > 0 ? restante / normais.length : 0;

  let atualizadas = parcelas.map(p => {
    if (p.isIntermediaria && p.valorEspecifico != null && p.valorEspecifico > 0) {
      return { ...p, valorBase: p.valorEspecifico };
    }
    return { ...p, valorBase: Math.max(0, valorDistribuido) };
  });

  // ajuste de arredondamento na última parcela
  const somaTotal = atualizadas.reduce((acc, p) => acc + p.valorBase, 0);
  const diferenca = valorFinanciado - somaTotal;
  if (Math.abs(diferenca) > 0.001 && atualizadas.length > 0) {
    atualizadas = [...atualizadas];
    atualizadas[atualizadas.length - 1] = {
      ...atualizadas[atualizadas.length - 1],
      valorBase: atualizadas[atualizadas.length - 1].valorBase + diferenca,
    };
  }

  return atualizadas;
}

function recalcularParcelas(parcelas, dataBase, valorFinanciado, taxaMensal, numeroParcelas) {
  if (!parcelas.length) return [];

  let atualizadas = distribuirValorBase(parcelas, valorFinanciado);

  return atualizadas.map((p) => {
    const dias = p.data && dataBase ? calcularDias(dataBase, p.data) : 0;
    const vBase = Math.max(0, p.valorBase || 0);
    const juros = dias > 0 ? calcularJurosPorDias(vBase, taxaMensal, dias) : 0;
    const total = vBase + juros;
    return { ...p, valorBase: vBase, dias, juros, total };
  });
}

// MODO PRICE com prazo em dias reais:
// 1. Gerar datas → 2. Calcular dias_i → 3. fator_i = (1+taxa)^(dias_i/30)
// 4. parcelaFixa = valorBruto / soma(1/fator_i)
// 5. valorBase_i = parcelaFixa / fator_i ; juros_i = parcelaFixa - valorBase_i

function gerarCronogramaPrice(valorLiquido, taxaMensal, numeroParcelas, taxaFinanceira, dataBase, prazoTotalDias) {
  const taxa = taxaMensal / 100;
  const taxaFin = (taxaFinanceira || 0) / 100;
  const valorBruto = taxaFin > 0 ? valorLiquido / (1 - taxaFin) : valorLiquido;

  // 1. Gerar datas
  const datas = [];
  for (let k = 1; k <= numeroParcelas; k++) {
    let dataParcela = "";
    if (dataBase) {
      const d = new Date(dataBase + "T00:00:00");
      if (prazoTotalDias && prazoTotalDias > 0) {
        // distribui os dias uniformemente
        const diasParcela = Math.round((prazoTotalDias / numeroParcelas) * k);
        d.setDate(d.getDate() + diasParcela);
      } else {
        d.setMonth(d.getMonth() + k);
      }
      dataParcela = d.toISOString().split("T")[0];
    }
    datas.push(dataParcela);
  }

  // 2. Calcular dias de cada parcela (a partir da data base)
  const diasArr = datas.map(dt => calcularDias(dataBase, dt));

  // 3. Calcular fatores exponenciais: fator_i = (1 + taxa)^(dias_i / 30)
  const fatores = diasArr.map(d => Math.pow(1 + taxa, d / 30));

  // 4. Parcela fixa: parcelaFixa = valorBruto / soma(1 / fator_i)
  const somaInversos = fatores.reduce((acc, f) => acc + 1 / f, 0);
  const parcelaFixa = valorBruto / somaInversos;

  // 5. Calcular por parcela
  let saldo = valorBruto;
  const parcelas = [];
  for (let k = 0; k < numeroParcelas; k++) {
    const fator = fatores[k];
    const valorBase = parcelaFixa / fator;                   // amortização
    const juros = parcelaFixa - valorBase;
    saldo = k === 0 ? valorBruto - valorBase : saldo - valorBase;
    const saldoFinal = k === numeroParcelas - 1 ? 0 : Math.max(0, saldo);

    parcelas.push({
      numero: k + 1,
      data: datas[k],
      dias: diasArr[k],
      valorBase: Math.max(0, valorBase),
      juros: Math.max(0, juros),
      total: parcelaFixa,
      saldo: saldoFinal,
      isIntermediaria: false,
      valorEspecifico: null,
      isPrice: true,
    });
  }

  return { parcelas, valorBruto, pmt: parcelaFixa };
}

function gerarParcelas(numeroParcelas, dataBase, valorFinanciado, taxaMensal, modoCalculo = "variavel", taxaFinanceira = 0) {
  if (modoCalculo === "price") {
    return gerarCronogramaPrice(valorFinanciado, taxaMensal, numeroParcelas, taxaFinanceira, dataBase).parcelas;
  }
  const parcelas = [];
  for (let i = 1; i <= numeroParcelas; i++) {
    parcelas.push({ numero: i, data: "", isIntermediaria: false, valorEspecifico: null, dias: 0, valorBase: 0, juros: 0, total: 0 });
  }
  return recalcularParcelas(parcelas, dataBase, valorFinanciado, taxaMensal, numeroParcelas);
}

export default function FinanceiroCalculadoraFinanciamento() {
  const qc = useQueryClient();
  const [view, setView] = useState("lista");
  const [erros, setErros] = useState({});
  const [codigoSimulacao, setCodigoSimulacao] = useState(null);
  const [modalVisualizar, setModalVisualizar] = useState({ open: false, simulacao: null, parcelas: [] });
  const [form, setForm] = useState({
    valor_financiamento: "",
    valor_entrada: "",
    taxa_juros_mensal: "",
    numero_parcelas: "",
    data_base: new Date().toISOString().split("T")[0],
    taxa_financeira: "",
    prazo_total_dias: "",
  });
  const [modoCalculo, setModoCalculo] = useState("variavel");
  const [parcelas, setParcelas] = useState([]);
  const [parcelasGeradas, setParcelasGeradas] = useState(false);
  const [valorBrutoPrice, setValorBrutoPrice] = useState(null);
  const [pmtPrice, setPmtPrice] = useState(null);

  const { data: simulacoes = [], isLoading } = useQuery({
    queryKey: ["fin-simulacoes", empresa_id],
    queryFn: async () => {
      const { data } = await supabase.from("fin_simulacoes_financiamento").select("*").eq("empresa_id", empresa_id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: view === "lista",
  });

  const excluirMutation = useMutation({
    mutationFn: async (id) => {
      await supabase.from("fin_simulacoes_financiamento").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries(["fin-simulacoes"]),
  });

  const handleVisualizar = async (simulacao) => {
    const { data: parcs } = await supabase.from("fin_parcelas_financiamento").select("*").eq("simulacao_id", simulacao.id).order("indice");
    setModalVisualizar({ open: true, simulacao, parcelas: parcs || [] });
  };

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const valor_total = parseMoeda(form.valor_financiamento);
      const numero_parcelas = parseInt(form.numero_parcelas) || 0;
      const taxa_juros = parseFloat(form.taxa_juros_mensal) || 0;
      const data_base = form.data_base;

      if (!valor_total || !numero_parcelas || !taxa_juros || !data_base) {
        console.error("Dados obrigatórios faltando", { valor_total, numero_parcelas, taxa_juros, data_base });
        throw new Error("Preencha todos os campos obrigatórios antes de salvar.");
      }

      // Validação V3 PRO: soma dos valorBase deve fechar o valor de referência
      const valorFinanciado = valor_total - (parseMoeda(form.valor_entrada) || 0);
      const valorReferencia = modoCalculo === "price" && valorBrutoPrice ? valorBrutoPrice : valorFinanciado;
      const somaBase = parcelas.reduce((acc, p) => acc + (p.valorBase || 0), 0);
      if (Math.abs(somaBase - valorReferencia) > 0.05) {
        throw new Error(`As parcelas não fecham o valor do financiamento. Diferença: R$ ${formatMoeda(Math.abs(somaBase - valorReferencia))}`);
      }

      const body = {
        action: "salvar",
        simulacao: {
          empresa_id,
          valor_financiamento: valor_total,
          valor_entrada: parseMoeda(form.valor_entrada),
          taxa_juros_mensal: taxa_juros,
          numero_parcelas,
          data_base,
          tipo_parcelamento: modoCalculo === "price" ? "fixa" : "variavel",
          valor_bruto: modoCalculo === "price" ? valorBrutoPrice : null,
          taxa_financeira: modoCalculo === "price" ? (parseFloat(form.taxa_financeira) || 0) : null,
        },
        parcelas: (parcelas || []).map((p, idx) => ({
          indice: idx,
          valor_base: p.valorBase,
          valor_parcela: p.total,
          juros: p.juros,
          dias_decorridos: p.dias,
          data_parcela: p.data,
          eh_intermediaria: false,
          saldo_restante: p.saldo || null,
        })),
      };

      console.log("=== DEBUG FRONTEND ===");
      console.log("Payload enviado:", body);
      console.log("======================");

      const { data: simData, error: simErr } = await supabase.from("fin_simulacoes_financiamento").insert({
        empresa_id,
        valor_financiamento: body.simulacao.valor_financiamento,
        valor_entrada: body.simulacao.valor_entrada,
        taxa_juros_mensal: body.simulacao.taxa_juros_mensal,
        numero_parcelas: body.simulacao.numero_parcelas,
        data_base: body.simulacao.data_base,
        tipo_parcelamento: body.simulacao.tipo_parcelamento,
        valor_bruto: body.simulacao.valor_bruto,
        taxa_financeira: body.simulacao.taxa_financeira,
      }).select().single();
      if (simErr) throw new Error(simErr.message);
      if (body.parcelas?.length > 0) {
        await supabase.from("fin_parcelas_financiamento").insert(
          body.parcelas.map(p => ({ ...p, simulacao_id: simData.id, empresa_id }))
        );
      }
      return simData;
    },
    onSuccess: (data) => {
      qc.invalidateQueries(["fin-simulacoes"]);
      if (data?.codigo_sequencial) setCodigoSimulacao(data.codigo_sequencial);
      alert("Simulação salva com sucesso!");
      resetForm();
      setView("lista");
    },
    onError: (e) => alert("Erro ao salvar: " + e.message),
  });

  const resetForm = () => {
    setForm({ valor_financiamento: "", valor_entrada: "", taxa_juros_mensal: "", numero_parcelas: "", data_base: new Date().toISOString().split("T")[0], taxa_financeira: "", prazo_total_dias: "" });
    setParcelas([]);
    setParcelasGeradas(false);
    setModoCalculo("variavel");
    setCodigoSimulacao(null);
    setErros({});
    setValorBrutoPrice(null);
    setPmtPrice(null);
  };

  const validar = () => {
    const e = {};
    const vf = parseMoeda(form.valor_financiamento);
    const ve = parseMoeda(form.valor_entrada);
    const taxa = parseFloat(form.taxa_juros_mensal);
    const np = parseInt(form.numero_parcelas);
    if (!vf) e.valor_financiamento = "Obrigatório";
    if (ve > vf) e.valor_entrada = "Entrada maior que o financiamento";
    if (!taxa || taxa <= 0) e.taxa_juros_mensal = "Deve ser maior que zero";
    if (!np || np <= 0) e.numero_parcelas = "Deve ser maior que zero";
    if (!form.data_base) e.data_base = "Obrigatório";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleGerarParcelas = () => {
    if (!validar()) return;
    const vf = parseMoeda(form.valor_financiamento) - parseMoeda(form.valor_entrada);
    const np = parseInt(form.numero_parcelas);
    const taxa = parseFloat(form.taxa_juros_mensal);
    const taxaFin = parseFloat(form.taxa_financeira) || 0;

    if (modoCalculo === "price") {
      const prazoTotalDias = parseInt(form.prazo_total_dias) || 0;
      const { parcelas: geradas, valorBruto, pmt } = gerarCronogramaPrice(vf, taxa, np, taxaFin, form.data_base, prazoTotalDias);
      // Validação PRICE
      const totalAmort = geradas.reduce((acc, p) => acc + p.valorBase, 0);
      if (Math.abs(totalAmort - valorBruto) > 0.05) {
        alert("Erro no cálculo das parcelas PRICE. Verifique os parâmetros.");
        return;
      }
      setValorBrutoPrice(valorBruto);
      setPmtPrice(pmt);
      setParcelas(geradas);
    } else {
      setValorBrutoPrice(null);
      setPmtPrice(null);
      const geradas = gerarParcelas(np, form.data_base, vf, taxa, modoCalculo);
      setParcelas(geradas);
    }
    setParcelasGeradas(true);
    registrarLog("recalculo_parcelas", { valor_financiado: vf, numero_parcelas: np, taxa_mensal: taxa, data_base: form.data_base, modo_calculo: modoCalculo });
  };

  const recalc = useCallback((novasParcelas) => {
    if (modoCalculo === "price") return novasParcelas; // price não permite edição manual
    const vf = parseMoeda(form.valor_financiamento) - parseMoeda(form.valor_entrada);
    const np = parseInt(form.numero_parcelas) || novasParcelas.length;
    return recalcularParcelas(novasParcelas, form.data_base, vf, parseFloat(form.taxa_juros_mensal), np);
  }, [form, modoCalculo]);

  const registrarLog = useCallback(async (acao, detalhes) => {
  // Log silencioso — sem dependência do base44
  }, []);

  const handleDataChange = (idx, novaData) => {
    // Validação: não permitir data menor que a data base
    if (novaData && form.data_base && novaData < form.data_base) {
      alert("A data da parcela não pode ser menor que a data base.");
      return;
    }
    setParcelas((prev) => {
      const upd = prev.map((p, i) => i === idx ? { ...p, data: novaData } : p);
      const recalculadas = recalc(upd);
      registrarLog("alteracao_data", { parcela: idx + 1, nova_data: novaData, data_base: form.data_base });
      return recalculadas;
    });
  };

  const toggleIntermediaria = (idx) => {
    setParcelas((prev) => {
      const upd = prev.map((p, i) =>
        i === idx ? { ...p, isIntermediaria: !p.isIntermediaria, valorEspecifico: !p.isIntermediaria ? p.valorBase : null } : p
      );
      const recalculadas = recalc(upd);
      const parcelaAtual = recalculadas[idx];
      registrarLog("inclusao_intermediaria", { parcela: idx + 1, ativo: parcelaAtual.isIntermediaria });
      return recalculadas;
    });
  };

  const handleValorInterChange = (idx, novoValor) => {
    const vf = parseMoeda(form.valor_financiamento) - parseMoeda(form.valor_entrada);
    setParcelas((prev) => {
      const upd = prev.map((p, i) => i === idx ? { ...p, valorEspecifico: novoValor } : p);
      const somaInter = upd
        .filter(p => p.isIntermediaria && p.valorEspecifico != null && p.valorEspecifico > 0)
        .reduce((acc, p) => acc + p.valorEspecifico, 0);
      if (somaInter > vf + 0.01) {
        alert("A soma das parcelas intermediárias não pode ser maior que o valor financiado.");
        return prev;
      }
      return recalc(upd);
    });
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
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
    doc.text(`Emitido: ${new Date().toLocaleDateString("pt-BR")}`, 196, y, { align: "right" });
    y += 7;

    // ── Dados ─────────────────────────────────────────────────────────────
    doc.setFont("courier", "bold");
    doc.text("DADOS DA SIMULACAO", 14, y); y += 5;
    doc.setLineWidth(0.3); doc.setDrawColor(180); doc.line(14, y, 196, y); y += 5;

    const tipoLabel = modoCalculo === "price" ? "PRICE — Parcelas Fixas" : "Parcelas Variaveis";
    const vLiq = parseMoeda(form.valor_financiamento) - parseMoeda(form.valor_entrada);

    if (modoCalculo === "price") {
      const dadosP = [
        ["Tipo", tipoLabel],
        ["Valor Liquido", `R$  ${formatMoeda(vLiq)}`],
        ["Valor Bruto (gross-up)", `R$  ${formatMoeda(valorBrutoPrice)}`],
        ["Parcela Fixa (PMT)", `R$  ${formatMoeda(pmtPrice)}`],
        ["Taxa Mensal", `${form.taxa_juros_mensal}%`],
        ["Taxa Financeira", `${form.taxa_financeira || 0}%`],
        ["Parcelas", `${form.numero_parcelas}x`],
        ["Data Base", form.data_base],
      ];
      dadosP.forEach(([label, val], i) => {
        const col = i % 2 === 0 ? 14 : 105;
        if (i % 2 === 0 && i > 0) y += 6;
        doc.setFont("courier", "bold"); doc.text(label, col, y);
        doc.setFont("courier", "normal"); doc.text(val, col + 50, y);
        if (i % 2 === 1) {} // linha par já avança no próximo
      });
      y += 10;
    } else {
      const dadosL1 = [["Financiamento", `R$  ${formatMoeda(parseMoeda(form.valor_financiamento))}`], ["Entrada", `R$  ${formatMoeda(parseMoeda(form.valor_entrada))}`]];
      const dadosL2 = [["Taxa Mensal", `${form.taxa_juros_mensal}%`], ["Parcelas", `${form.numero_parcelas}x`], ["Data Base", form.data_base]];
      dadosL1.forEach(([label, val], i) => {
        doc.setFont("courier", "bold"); doc.text(label, 14 + i * 92, y);
        doc.setFont("courier", "normal"); doc.text(val, 14 + i * 92 + 32, y);
      });
      y += 6;
      dadosL2.forEach(([label, val], i) => {
        doc.setFont("courier", "bold"); doc.text(label, 14 + i * 61, y);
        doc.setFont("courier", "normal"); doc.text(val, 14 + i * 61 + 28, y);
      });
      y += 10;
    }

    // ── Cabeçalho da tabela ───────────────────────────────────────────────
    const isPrice = modoCalculo === "price";
    // Price: Parc | Data | Amortização | Juros | Total | Saldo
    // Variável: Parc | Data | Dias | Valor Base | Juros | Total
    const COL_P = { parc: 14, data: 26, dias: 58, col3_val: 92, juros_rs: 96, juros_val: 133, tot_rs: 137, tot_val: 170, saldo_rs: 174, saldo_val: 196 };

    doc.setFillColor(59, 92, 204);
    doc.rect(14, y - 5, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text("PARC", COL.parc, y);
    doc.text("DATA", COL.data + 2, y);
    if (isPrice) {
      doc.text("DIAS", COL_P.dias, y, { align: "right" });
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

    parcelas.forEach((p, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(245, 247, 251); doc.rect(14, isPrice ? y - 4.5 : y - 4.5, 182, ROW_H, "F"); }

      doc.setFont("courier", "bold");
      doc.text(String(p.numero).padStart(2, "0"), COL.parc, y);
      doc.setFont("courier", "normal");
      doc.text(p.data || "---", COL.data, y);

      if (isPrice) {
        doc.setTextColor(0, 0, 0); doc.text(String(p.dias || 0), COL_P.dias, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.col3_val - 10, y);
        doc.setTextColor(0, 0, 0);       doc.text(formatMoeda(p.valorBase || 0), COL_P.col3_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.juros_rs, y);
        doc.setTextColor(180, 80, 0);    doc.text(formatMoeda(p.juros || 0), COL_P.juros_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.tot_rs, y);
        doc.setFont("courier", "bold");
        doc.setTextColor(30, 60, 180);   doc.text(formatMoeda(p.total || 0), COL_P.tot_val, y, { align: "right" });

        doc.setFont("courier", "normal");
        doc.setTextColor(100, 100, 100); doc.text("R$", COL_P.saldo_rs, y);
        doc.setTextColor(80, 80, 80);    doc.text(formatMoeda(p.saldo || 0), COL_P.saldo_val, y, { align: "right" });
      } else {
        doc.setTextColor(0, 0, 0); doc.text(String(p.dias || 0), COL.dias, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL.base_rs, y);
        doc.setTextColor(0, 0, 0);       doc.text(formatMoeda(p.valorBase || 0), COL.base_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL.juros_rs, y);
        doc.setTextColor(180, 80, 0);    doc.text(formatMoeda(p.juros || 0), COL.juros_val, y, { align: "right" });

        doc.setTextColor(100, 100, 100); doc.text("R$", COL.tot_rs, y);
        doc.setFont("courier", "bold");
        doc.setTextColor(30, 60, 180);   doc.text(formatMoeda(p.total || 0), COL.tot_val, y, { align: "right" });
      }
      doc.setFont("courier", "normal"); doc.setTextColor(0, 0, 0);
      y += ROW_H;
    });

    // ── Totais ────────────────────────────────────────────────────────────
    const tJuros = parcelas.reduce((s, p) => s + (p.juros || 0), 0);
    const tGeral = parcelas.reduce((s, p) => s + (p.total || 0), 0);
    doc.setFillColor(30, 40, 80);
    doc.rect(14, y - 4.5, 182, ROW_H + 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text("TOTAL GERAL", COL.parc, y + 1);
    doc.text("R$", COL.juros_rs, y + 1);
    doc.text(formatMoeda(tJuros), COL.juros_val, y + 1, { align: "right" });
    doc.text("R$", COL.tot_rs, y + 1);
    doc.text(formatMoeda(tGeral), COL.tot_val, y + 1, { align: "right" });

    // ── Rodapé ────────────────────────────────────────────────────────────
    doc.setFontSize(7.5); doc.setTextColor(150); doc.setFont("courier", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")} — CIAMONARO ERP v1.0`, 105, 289, { align: "center" });
    doc.save(`simulacao-financiamento-${Date.now()}.pdf`);
  };

  const totalJuros = parcelas.reduce((s, p) => s + (p.juros || 0), 0);
  const totalGeral = parcelas.reduce((s, p) => s + (p.total || 0), 0);

  const COLUNAS = [
    {
      key: "codigo_sequencial",
      label: "Código",
      render: (v) => <span className="font-mono text-xs font-semibold text-blue-700">#{String(v || 0).padStart(3, "0")}</span>,
    },
    {
      key: "valor_financiamento",
      label: "Financiamento",
      render: (v) => `R$ ${formatMoeda(v)}`,
    },
    {
      key: "valor_entrada",
      label: "Entrada",
      render: (v) => `R$ ${formatMoeda(v)}`,
    },
    {
      key: "taxa_juros_mensal",
      label: "Taxa",
      render: (v) => `${v}%`,
    },
    {
      key: "numero_parcelas",
      label: "Parcelas",
      render: (v) => `${v}x`,
    },
    {
      key: "data_base",
      label: "Data Base",
      render: (v) => v || "—",
    },
    {
      key: "created_at",
      label: "Criado em",
      render: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—",
    },
  ];

  if (view === "lista") {
    return (
      <>
      <ModalVisualizarSimulacao
        open={modalVisualizar.open}
        simulacao={modalVisualizar.simulacao}
        parcelas={modalVisualizar.parcelas}
        onClose={() => setModalVisualizar({ open: false, simulacao: null, parcelas: [] })}
      />
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setView("form"); }} style={{ background: "#3B5CCC" }} className="text-white gap-2 rounded-lg">
              <Calculator className="h-4 w-4" /> Nova Simulação
            </Button>
          </div>
          <ErpTable
            titulo="Simulações de Financiamento"
            colunas={COLUNAS}
            dados={simulacoes}
            isLoading={isLoading}
            acoes={[
              {
                titulo: "Visualizar",
                icone: Eye,
                className: "hover:text-blue-600",
                onClick: (row) => handleVisualizar(row),
              },
              {
                titulo: "Excluir",
                icone: Trash2,
                className: "hover:text-red-600",
                onClick: (row) => {
                  if (confirm("Excluir esta simulação?")) excluirMutation.mutate(row.id);
                },
              },
            ]}
          />
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { resetForm(); setView("lista"); }} className="text-slate-500">
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Nova Simulação</h1>
              <p className="text-xs text-slate-500">Controle por data com juros por período</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {codigoSimulacao && (
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Código</p>
                <p className="text-lg font-bold text-blue-700 font-mono">
                  #{String(codigoSimulacao).padStart(3, "0")}
                </p>
              </div>
            )}
          <div className="flex gap-2">
            {codigoSimulacao ? (
              <>
                <Button variant="outline" onClick={gerarPDF} className="gap-2">
                  <FileText className="h-4 w-4" /> Gerar PDF
                </Button>
                <Button variant="outline" onClick={() => {
                  const sim = simulacoes.find(s => s.codigo_sequencial === codigoSimulacao);
                  if (sim) handleVisualizar(sim);
                }} className="gap-2">
                  <Eye className="h-4 w-4" /> Visualizar
                </Button>
              </>
            ) : (
              <Button
                onClick={() => salvarMutation.mutate()}
                disabled={!parcelasGeradas || salvarMutation.isPending}
                style={{ background: "#3B5CCC" }}
                className="text-white gap-2 rounded-lg"
              >
                <Save className="h-4 w-4" />
                {salvarMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
          </div>
        </div>

        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800">Dados do Financiamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Valor do Financiamento</Label>
                <MoedaInput value={form.valor_financiamento} onChange={(v) => setForm((f) => ({ ...f, valor_financiamento: v }))} className={erros.valor_financiamento ? "border-red-400" : ""} />
                {erros.valor_financiamento && <p className="text-xs text-red-500">{erros.valor_financiamento}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Valor da Entrada</Label>
                <MoedaInput value={form.valor_entrada} onChange={(v) => setForm((f) => ({ ...f, valor_entrada: v }))} className={erros.valor_entrada ? "border-red-400" : ""} />
                {erros.valor_entrada && <p className="text-xs text-red-500">{erros.valor_entrada}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Taxa de Juros Mensal (%)</Label>
                <Input type="number" step="0.01" min="0" autoComplete="off" value={form.taxa_juros_mensal} onChange={(e) => setForm((f) => ({ ...f, taxa_juros_mensal: e.target.value }))} className={erros.taxa_juros_mensal ? "border-red-400" : ""} />
                {erros.taxa_juros_mensal && <p className="text-xs text-red-500">{erros.taxa_juros_mensal}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Número de Parcelas</Label>
                <Input type="number" min="1" autoComplete="off" value={form.numero_parcelas} onChange={(e) => setForm((f) => ({ ...f, numero_parcelas: e.target.value }))} className={erros.numero_parcelas ? "border-red-400" : ""} />
                {erros.numero_parcelas && <p className="text-xs text-red-500">{erros.numero_parcelas}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Data Base (início)</Label>
                <Input type="date" value={form.data_base} onChange={(e) => setForm((f) => ({ ...f, data_base: e.target.value }))} className={erros.data_base ? "border-red-400" : ""} />
                {erros.data_base && <p className="text-xs text-red-500">{erros.data_base}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Tipo de Parcelamento</Label>
                <select
                  value={modoCalculo}
                  onChange={(e) => {
                    setModoCalculo(e.target.value);
                    if (parcelasGeradas) registrarLog("mudanca_modo_calculo", { modo_anterior: modoCalculo, modo_novo: e.target.value });
                    setParcelasGeradas(false);
                    setParcelas([]);
                    setValorBrutoPrice(null);
                    setPmtPrice(null);
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="variavel">Parcelas Variáveis</option>
                  <option value="price">Parcelas Fixas (PRICE)</option>
                </select>
              </div>
              {modoCalculo === "price" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Taxa da Financeira (%) <span className="text-slate-400 font-normal">— gross-up</span></Label>
                  <Input
                    type="number" step="0.01" min="0" max="99" autoComplete="off"
                    placeholder="ex: 3.5"
                    value={form.taxa_financeira}
                    onChange={(e) => setForm((f) => ({ ...f, taxa_financeira: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400">Valor bruto = Líquido ÷ (1 − taxa)</p>
                </div>
              )}
              {modoCalculo === "price" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Prazo Total (dias) <span className="text-slate-400 font-normal">— opcional</span></Label>
                  <Input
                    type="number" min="1" autoComplete="off"
                    placeholder="ex: 360"
                    value={form.prazo_total_dias}
                    onChange={(e) => setForm((f) => ({ ...f, prazo_total_dias: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400">Vazio = parcelas mensais exatas</p>
                </div>
              )}
              <div className="flex items-end">
                <Button onClick={handleGerarParcelas} className="w-full gap-2 bg-slate-800 hover:bg-slate-700 text-white">
                  <RefreshCw className="h-4 w-4" />
                  {parcelasGeradas ? "Regerar Parcelas" : "Gerar Parcelas"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info box PRICE */}
        {parcelasGeradas && modoCalculo === "price" && valorBrutoPrice && (
          <div className="flex flex-wrap gap-4 bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 text-sm">
            <div><span className="font-medium text-blue-700">Valor Líquido (empresa recebe):</span> <span className="font-mono font-bold text-blue-900">R$ {formatMoeda(parseMoeda(form.valor_financiamento) - parseMoeda(form.valor_entrada))}</span></div>
            <div><span className="font-medium text-blue-700">Valor Bruto (gross-up):</span> <span className="font-mono font-bold text-slate-800">R$ {formatMoeda(valorBrutoPrice)}</span></div>
            <div><span className="font-medium text-blue-700">Parcela Fixa (PMT):</span> <span className="font-mono font-bold text-green-700">R$ {formatMoeda(pmtPrice)}</span></div>
          </div>
        )}

        {parcelasGeradas && parcelas.length > 0 && (
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-semibold text-slate-800">Parcelas — {parcelas.length} no total</CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modoCalculo === "price" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {modoCalculo === "price" ? "PRICE — Parcela Fixa" : "Valor Variável"}
                  </span>
                </div>
                {modoCalculo !== "price" && (
                  <p className="text-xs text-slate-400">Marque "Intermediária" para definir valor específico na parcela</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 w-12">Parc.</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500">Data da Parcela</th>
                      {modoCalculo === "price" && <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 w-16">Dias</th>}
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500">Amortização</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500">Juros</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500">Total Parcela</th>
                      {modoCalculo === "price" && <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500">Saldo</th>}
                      {modoCalculo !== "price" && <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 w-16">Dias</th>}
                      {modoCalculo !== "price" && <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 w-28">Intermediária</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map((p, idx) => (
                      <tr key={p.numero} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-sm text-slate-700">{String(p.numero).padStart(2, "0")}</span>
                        </td>
                        <td className="px-3 py-2.5">
                         {modoCalculo === "price" ? (
                           <span className="text-slate-600 text-sm font-mono">{p.data || "—"}</span>
                         ) : (
                           <Input type="date" value={p.data || ""} onChange={(e) => handleDataChange(idx, e.target.value)} className="h-8 text-sm w-40" />
                         )}
                        </td>
                        {modoCalculo === "price" && (
                         <td className="px-3 py-2.5 text-right">
                           <span className="font-mono text-sm text-slate-600 font-semibold">{p.dias || "—"}</span>
                         </td>
                        )}
                        <td className="px-3 py-2.5 text-right">
                          {modoCalculo !== "price" && p.isIntermediaria ? (
                            <MoedaInput value={p.valorEspecifico || ""} onChange={(v) => handleValorInterChange(idx, v)} className="h-8 text-sm text-right w-36 ml-auto" />
                          ) : (
                            <span className="text-slate-700 font-mono text-sm">{p.valorBase > 0 ? `R$ ${formatMoeda(p.valorBase)}` : "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm">
                          {p.juros > 0 ? <span className="text-orange-600">R$ {formatMoeda(p.juros)}</span> : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {p.total > 0 ? (
                            <span className="font-bold font-mono text-sm text-blue-700">R$ {formatMoeda(p.total)}</span>
                          ) : "—"}
                        </td>
                        {modoCalculo === "price" && (
                          <td className="px-3 py-2.5 text-right font-mono text-sm text-slate-500">
                            R$ {formatMoeda(p.saldo || 0)}
                          </td>
                        )}
                        {modoCalculo !== "price" && (
                          <td className="px-3 py-2.5 text-right">
                            <span className={`font-mono text-sm ${p.dias > 0 ? "text-slate-900 font-semibold" : "text-slate-300"}`}>{p.dias > 0 ? p.dias : "—"}</span>
                          </td>
                        )}
                        {modoCalculo !== "price" && (
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleIntermediaria(idx)}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                                p.isIntermediaria
                                  ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {p.isIntermediaria ? "✓ Inter." : "Inter."}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white">
                      <td colSpan={modoCalculo === "price" ? 2 : 3} className="px-3 py-3 text-sm font-semibold">Total Geral</td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-orange-300">R$ {formatMoeda(totalJuros)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-lg">R$ {formatMoeda(totalGeral)}</td>
                      {modoCalculo === "price" && <td />}
                      {modoCalculo !== "price" && <td />}
                      {modoCalculo !== "price" && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  );
}