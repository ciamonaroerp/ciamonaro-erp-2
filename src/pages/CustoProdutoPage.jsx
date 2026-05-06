import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from 'xlsx';
import { supabase } from "@/components/lib/supabaseClient";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, DollarSign, AlertTriangle, TrendingUp, Search, FileJson, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const PER_PAGE = 50;

function formatarData(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatCusto(val) {
  const n = parseFloat(val ?? 0);
  return isNaN(n) ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatConsumo(val) {
  const n = parseFloat(val ?? 0);
  if (isNaN(n) || n === 0) return "—";
  return n.toFixed(3).replace(".", ",") + " kg";
}

function calcConsumoTotal(composicoes) {
  if (!Array.isArray(composicoes)) return 0;
  return composicoes.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0);
}

function Paginacao({ pagina, total, perPage, onChange }) {
  const totalPaginas = Math.max(1, Math.ceil(total / perPage));
  if (total <= perPage) return null;
  return (
    <div className="flex items-center justify-between px-1 py-3 border-t border-slate-200">
      <span className="text-sm text-slate-500">Página {pagina} de {totalPaginas}</span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina === 1}
          onClick={() => onChange(pagina - 1)}
        >Anterior</Button>
        <Button
          variant={pagina === totalPaginas ? "default" : "outline"}
          size="sm"
          disabled={pagina === totalPaginas}
          onClick={() => onChange(pagina + 1)}
          className={pagina < totalPaginas ? "font-semibold" : ""}
        >Próxima</Button>
      </div>
    </div>
  );
}

function ItemRow({ item, indice, onAprovarCusto }) {
  const consumoTotal = calcConsumoTotal(item.composicoes);
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="px-1 py-3 text-center text-xs font-medium text-slate-400">{indice}</td>
      <td className="px-1 py-3 text-xs font-medium text-slate-800 font-mono whitespace-nowrap">{item.codigo_produto || '—'}</td>
      <td className="px-1 py-3 text-xs text-slate-700 whitespace-nowrap">{item.nome_produto || '—'}</td>
      <td className="px-1 py-3 text-xs text-slate-700 whitespace-nowrap">{item.artigo_nome || '—'}</td>
      <td className="px-1 py-3 text-xs text-slate-700 whitespace-nowrap">{item.cor_nome || '—'}</td>
      <td className="px-1 py-3 text-xs text-slate-800 font-mono whitespace-nowrap text-right">{formatConsumo(consumoTotal)}</td>
      <td className="px-1 py-3 text-xs text-slate-700 font-mono whitespace-nowrap text-right">{formatCusto(item.custo_kg)}</td>
      <td className="px-1 py-3 text-xs text-slate-700 font-mono whitespace-nowrap text-right">{formatCusto(item.custo_un)}</td>
      <td className="px-1 py-3 text-center">
        <Button size="sm" className={cn("h-6 w-6 p-0", (!item.custo_kg || item.custo_kg === 0) ? "bg-yellow-400 hover:bg-yellow-500 text-slate-900" : "bg-blue-600 hover:bg-blue-700 text-white")} onClick={() => onAprovarCusto(item.codigo_unico, item.produto_id, item.custo_kg, item.codigo_unico)}>
          <DollarSign className="h-3 w-3" />
        </Button>
      </td>
      <td className="px-1 py-3 text-xs text-slate-600 whitespace-nowrap">{formatarData(item.sincronizado_em)}</td>
      <td className="px-1 py-3 text-center">
        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium", item.status === "inativo" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
          {item.status === "inativo" ? "Inativo" : "Ativo"}
        </span>
      </td>
    </tr>
  );
}

const TABLE_HEADER = (
  <thead>
    <tr className="border-b border-slate-100 bg-slate-50">
      <th className="px-1 py-3 text-center font-medium text-xs text-slate-500">#</th>
      <th className="px-1 py-3 text-left font-medium text-xs text-slate-500 whitespace-nowrap">Cód.</th>
      <th className="px-1 py-3 text-left font-medium text-xs text-slate-500 whitespace-nowrap">Descrição</th>
      <th className="px-1 py-3 text-left font-medium text-xs text-slate-500 whitespace-nowrap">Artigo</th>
      <th className="px-1 py-3 text-left font-medium text-xs text-slate-500 whitespace-nowrap">Cor</th>
      <th className="px-1 py-3 text-right font-medium text-xs text-slate-500 whitespace-nowrap">Consumo</th>
      <th className="px-1 py-3 text-right font-medium text-xs text-slate-500 whitespace-nowrap">Cst/kg</th>
      <th className="px-1 py-3 text-right font-medium text-xs text-slate-500 whitespace-nowrap">Cst/un</th>
      <th className="px-1 py-3 text-center font-medium text-xs text-slate-500">$</th>
      <th className="px-1 py-3 text-left font-medium text-xs text-slate-500 whitespace-nowrap">Última sinc. custo/kg</th>
      <th className="px-1 py-3 text-center font-medium text-xs text-slate-500 whitespace-nowrap">Status</th>
    </tr>
  </thead>
);

function ModalConfirmacaoCusto({ open, onClose, codigoUnico, produtoId, descricaoArtigo, custoAtual, onSalvar, salvando }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [semHistorico, setSemHistorico] = useState(false);
  const [custoManual, setCustoManual] = useState("");
  const { empresa_id } = useEmpresa();

  React.useEffect(() => {
    if (!open || (!codigoUnico && !produtoId)) return;
    setDados(null);
    setSemHistorico(false);
    setCustoManual("");
    setCarregando(true);

    const params = { action: "get", empresa_id };
    if (codigoUnico) params.codigo_unico = codigoUnico;
    else params.produto_id = produtoId;

    supabase.from("ultimo_preco_produto").select("*").eq("empresa_id", empresa_id).eq("codigo_unico", codigoUnico || produtoId).then(({ data: histData }) => {
      if (!histData || histData.length === 0) { setSemHistorico(true); setCarregando(false); return; }
      const row = histData[0];
      const ultimo = parseFloat(row.ultimo_preco) || 0;
      const media = parseFloat(row.media_preco) || ultimo;
      const min = parseFloat(row.preco_min) || ultimo;
      const max = parseFloat(row.preco_max) || ultimo;
      const quantidade_amostras = row.quantidade_amostras || 1;
      const alerta = media > 0 && Math.abs(ultimo - media) / media > 0.2;
      const custoAtualNum = Number(custoAtual || 0);
      setDados({ custo_atual: custoAtualNum, ultimo, media, sugerido: media, min, max, quantidade_amostras, alerta, fornecedor: row.fornecedor_nome, numero_nf: row.numero_nf, data_nf: row.data_ultima_nf });
      setCarregando(false);
    }).catch(() => { setSemHistorico(true); setCarregando(false); });
  }, [open, codigoUnico, produtoId, custoAtual, empresa_id]);

  const fmtMoeda = v => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = v => `${v >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`;

  const valorParaAplicar = custoManual !== "" ? parseFloat(custoManual) : (semHistorico ? undefined : dados?.sugerido);
  const podeAplicar = !salvando && valorParaAplicar > 0 && !isNaN(valorParaAplicar);

  const variacaoUltimoMedia = dados && dados.media > 0
    ? ((dados.ultimo - dados.media) / dados.media) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Custo por Kg</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-slate-500">Código único: <span className="font-mono font-bold text-blue-700">{codigoUnico}</span></p>
              {descricaoArtigo && <p className="text-xs text-slate-500">Artigo: <span className="font-medium text-slate-700">{descricaoArtigo}</span></p>}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {carregando && (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Buscando histórico de preços...</span>
            </div>
          )}

          {!carregando && semHistorico && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Nenhum histórico de preço encontrado. Informe o valor manualmente.
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Custo por kg (R$)</label>
                <Input type="number" step="0.01" min="0" placeholder="Ex: 45.50" value={custoManual} onChange={e => setCustoManual(e.target.value)} autoFocus />
              </div>
            </div>
          )}

          {!carregando && dados && (
            <div className="space-y-3">
              {dados.alerta && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Preço fora do padrão</p>
                    <p className="text-xs text-amber-600 mt-0.5">O último preço da NF diverge mais de 20% da média recente. O preço sugerido foi ajustado para a média.</p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Último custo cadastrado:</span>
                  <span className="font-semibold text-slate-700">{dados.custo_atual > 0 ? fmtMoeda(dados.custo_atual) + "/kg" : "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Último preço (NF):</span>
                  <span className="font-semibold text-slate-800">{fmtMoeda(dados.ultimo)}/kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-1"><TrendingUp className="h-3 w-3" />Média recente ({dados.quantidade_amostras} NFs):</span>
                  <span className="font-semibold text-blue-700">{fmtMoeda(dados.media)}/kg</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Faixa (min–max):</span>
                  <span>{fmtMoeda(dados.min)} – {fmtMoeda(dados.max)}</span>
                </div>
                {dados.alerta && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Variação últ. vs média:</span>
                    <span className={cn("font-bold", variacaoUltimoMedia > 0 ? "text-red-600" : "text-green-600")}>{fmtPct(variacaoUltimoMedia)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Preço sugerido:</span>
                  <span className="font-bold text-green-700 text-base">{fmtMoeda(dados.sugerido)}/kg</span>
                </div>
              </div>

              {dados.fornecedor && (
                <p className="text-xs text-slate-400">Última NF: {dados.numero_nf} · {dados.fornecedor} · {formatarData(dados.data_nf)}</p>
              )}
              <div className="border-t border-slate-100 pt-3">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ou informe um valor manualmente (R$/kg)</label>
                <Input type="number" step="0.01" min="0" placeholder="Deixe em branco para usar o preço sugerido" value={custoManual} onChange={e => setCustoManual(e.target.value)} />
                {custoManual !== "" && <p className="text-xs text-amber-600 mt-1">Valor manual será aplicado no lugar do sugerido.</p>}
              </div>
              <p className="text-xs text-slate-500">O consumo e custo/un são calculados e persistidos no servidor automaticamente.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          {!carregando && (dados || semHistorico) && (
            <Button onClick={() => onSalvar(valorParaAplicar)} disabled={!podeAplicar} className="bg-green-600 hover:bg-green-700">
              {salvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Aplicando...</> : "Aplicar Custo"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabelaProdutoComposto({ precosData = [], isLoading, onAprovarCusto, busca, onTotalChange, filtroCustoZero, filtroSemConsumo: filtroSemConsumoComposto, filtroInativos: filtroInativosComposto = false }) {
  const [pagina, setPagina] = useState(1);

  const itens = useMemo(() => {
    const q = (busca ?? "").trim().toLowerCase();
    let filtrado = q
      ? precosData.filter(p =>
          (p.codigo_produto || "").toLowerCase().includes(q) ||
          (p.nome_produto || "").toLowerCase().includes(q) ||
          (p.codigo_unico || "").toLowerCase().includes(q) ||
          (p.artigo_nome || "").toLowerCase().includes(q) ||
          (p.cor_nome || "").toLowerCase().includes(q)
        )
      : [...precosData];
    if (!filtroInativosComposto) filtrado = filtrado.filter(p => p.status !== "inativo");
    else filtrado = filtrado.filter(p => p.status === "inativo");
    if (filtroCustoZero) filtrado = filtrado.filter(p => !p.custo_un || parseFloat(p.custo_un) === 0);
    if (filtroSemConsumoComposto) filtrado = filtrado.filter(p => calcConsumoTotal(p.composicoes) === 0);
    filtrado.sort((a, b) =>
      (a.codigo_produto || "").localeCompare(b.codigo_produto || "", "pt-BR", { numeric: true })
    );
    if (onTotalChange) onTotalChange(filtrado.length);
    return filtrado;
  }, [precosData, busca, onTotalChange, filtroCustoZero, filtroSemConsumoComposto, filtroInativosComposto]);

  useEffect(() => { setPagina(1); }, [busca, filtroCustoZero, filtroSemConsumoComposto, filtroInativosComposto]);

  const itensPagina = useMemo(() => itens.slice((pagina - 1) * PER_PAGE, pagina * PER_PAGE), [itens, pagina]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando dados...</span>
          </div>
        ) : itens.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Nenhum produto composto encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {TABLE_HEADER}
              <tbody>
                {(() => {
                  const grupos = {};
                  const ordem = [];
                  itensPagina.forEach(item => {
                    const chave = item.codigo_produto || item.produto_id || item.id;
                    if (!grupos[chave]) { grupos[chave] = []; ordem.push(chave); }
                    grupos[chave].push(item);
                  });
                  let grupoIdx = (pagina - 1) * PER_PAGE;
                  return ordem.map(chave => {
                    grupoIdx++;
                    const grupo = grupos[chave];
                    return grupo.map((item, i) => (
                      <tr key={item.id || item.codigo_unico} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-1 py-3 text-center text-xs font-medium text-slate-400">{i === 0 ? grupoIdx : ""}</td>
                        <td className="px-1 py-3 text-xs font-medium text-slate-800 font-mono whitespace-nowrap">{i === 0 ? (item.codigo_produto || "—") : ""}</td>
                        <td className="px-1 py-3 text-xs text-slate-700 whitespace-nowrap">{i === 0 ? (item.nome_produto || "—") : ""}</td>
                        <td className="px-1 py-3 text-xs text-slate-700 whitespace-nowrap">{item.artigo_nome || "—"}</td>
                        <td className="px-1 py-3 text-xs text-slate-700 whitespace-nowrap">{item.cor_nome || "—"}</td>
                        <td className="px-1 py-3 text-xs text-slate-800 font-mono whitespace-nowrap text-right">{formatConsumo(calcConsumoTotal(item.composicoes))}</td>
                        <td className="px-1 py-3 text-xs text-slate-700 font-mono whitespace-nowrap text-right">{formatCusto(item.custo_kg)}</td>
                        <td className="px-1 py-3 text-xs text-slate-700 font-mono whitespace-nowrap text-right">{formatCusto(item.custo_un)}</td>
                        <td className="px-1 py-3 text-center">
                          <Button size="sm" className={cn("h-6 w-6 p-0", (!item.custo_kg || item.custo_kg === 0) ? "bg-yellow-400 hover:bg-yellow-500 text-slate-900" : "bg-blue-600 hover:bg-blue-700 text-white")} onClick={() => onAprovarCusto(item.codigo_unico, item.produto_id, item.custo_kg, item.codigo_unico)}>
                            <DollarSign className="h-3 w-3" />
                          </Button>
                        </td>
                        <td className="px-1 py-3 text-xs text-slate-600 whitespace-nowrap">{formatarData(item.sincronizado_em)}</td>
                        <td className="px-1 py-3 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium", item.status === "inativo" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                            {item.status === "inativo" ? "Inativo" : "Ativo"}
                          </span>
                        </td>
                      </tr>
                    ));
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Paginacao pagina={pagina} total={itens.length} perPage={PER_PAGE} onChange={setPagina} />
    </div>
  );
}

export default function CustoProdutoPage() {
  const { empresa_id } = useEmpresa();
  const { showError, showSuccess } = useGlobalAlert();
  const qc = useQueryClient();
  const [modalCusto, setModalCusto] = useState({ open: false, codigoUnico: null, produtoId: null, custoAtual: null, descricaoArtigo: null });
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaComposto, setBuscaComposto] = useState("");
  const [filtroCustoZero, setFiltroCustoZero] = useState(false);
  const [filtroSemConsumo, setFiltroSemConsumo] = useState(false);
  const [filtroInativos, setFiltroInativos] = useState(false);
  const [filtroCustoZeroComposto, setFiltroCustoZeroComposto] = useState(false);
  const [filtroSemConsumoComposto, setFiltroSemConsumoComposto] = useState(false);
  const [filtroInativosComposto, setFiltroInativosComposto] = useState(false);
  const [totalCompostos, setTotalCompostos] = useState(0);
  const [paginaSimples, setPaginaSimples] = useState(1);

  const { data: todosRegistros = [], isLoading } = useQuery({
    queryKey: ["tabela-precos-sync-all", empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tabela_precos_sync')
        .select('id, codigo_produto, nome_produto, codigo_unico, produto_id, status, sincronizado_em, custo_kg, custo_un, num_composicoes, composicoes, grupo_id, artigo_nome, cor_nome, tipo_produto')
        .eq('empresa_id', empresa_id)
        .order('codigo_produto', { ascending: true });
      if (error) { console.error('[CustoProduto] query error:', error); return []; }
      return data || [];
    },
    enabled: !!empresa_id,
  });

  // Simples: num_composicoes <= 1
  // Composto: num_composicoes > 1
  const data = useMemo(() =>
    todosRegistros.filter(r => !r.num_composicoes || parseInt(r.num_composicoes) <= 1),
  [todosRegistros]);

  const dataCompostos = useMemo(() =>
    todosRegistros.filter(r => parseInt(r.num_composicoes) > 1),
  [todosRegistros]);

  const itensFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let result = q
      ? data.filter(p =>
          (p.codigo_produto || "").toLowerCase().includes(q) ||
          (p.nome_produto || "").toLowerCase().includes(q) ||
          (p.codigo_unico || "").toLowerCase().includes(q) ||
          (p.artigo_nome || "").toLowerCase().includes(q) ||
          (p.cor_nome || "").toLowerCase().includes(q)
        )
      : [...data];
    if (!filtroInativos) result = result.filter(p => p.status !== "inativo");
    else result = result.filter(p => p.status === "inativo");
    if (filtroCustoZero) result = result.filter(p => !p.custo_un || parseFloat(p.custo_un) === 0);
    if (filtroSemConsumo) result = result.filter(p => calcConsumoTotal(p.composicoes) === 0);
    return result;
  }, [data, busca, filtroCustoZero, filtroSemConsumo, filtroInativos]);

  useEffect(() => { setPaginaSimples(1); }, [busca, filtroCustoZero, filtroSemConsumo, filtroInativos]);

  const itensPaginadosSimples = useMemo(
    () => itensFiltrados.slice((paginaSimples - 1) * PER_PAGE, paginaSimples * PER_PAGE),
    [itensFiltrados, paginaSimples]
  );

  const handleAprovarCusto = (codigoUnico, produtoId, custoAtual, descricaoArtigo) => {
    setModalCusto({ open: true, codigoUnico, produtoId, custoAtual, descricaoArtigo });
  };

  const handleSalvarCusto = async (custoKgNovo) => {
    const valor = parseFloat(custoKgNovo);
    if (isNaN(valor) || valor <= 0) return;
    setSalvando(true);
    // Atualiza custo_kg na tabela_precos_sync diretamente
    let q = supabase.from("tabela_precos_sync").update({ custo_kg: valor });
    if (modalCusto.codigoUnico) q = q.eq("codigo_unico", modalCusto.codigoUnico);
    else q = q.eq("produto_id", modalCusto.produtoId);
    const { error } = await q;
    setSalvando(false);
    if (!error) {
      showSuccess({ title: "Custo atualizado!", description: "Custo aplicado com sucesso." });
      await qc.refetchQueries({ queryKey: ["tabela-precos-sync-all"] });
      setModalCusto({ open: false, codigoUnico: null, produtoId: null, custoAtual: null, descricaoArtigo: null });
    } else {
      showError({ title: "Erro ao aprovar custo", description: error.message });
    }
  };

  const gerarExcel = () => {
    try {
      const dadosSimples = itensFiltrados.map(p => ({
        'Código Produto': p.codigo_produto || '',
        'Código Único': p.codigo_unico || '',
        'Descrição': p.nome_produto || '',
        'Consumo Total (kg)': calcConsumoTotal(p.composicoes),
        'Custo/kg': p.custo_kg || 0,
        'Custo/un': p.custo_un || 0,
        'Status': p.status || '',
      }));
      const dadosCompostos = dataCompostos.map(p => ({
        'Código Produto': p.codigo_produto || '',
        'Código Único': p.codigo_unico || '',
        'Descrição': p.nome_produto || '',
        'Composições': p.num_composicoes || 0,
        'Consumo Total (kg)': calcConsumoTotal(p.composicoes),
        'Custo/kg': p.custo_kg || 0,
        'Custo/un': p.custo_un || 0,
        'Status': p.status || '',
      }));
      const wb = XLSX.utils.book_new();
      if (dadosSimples.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dadosSimples), 'Produtos Simples');
      if (dadosCompostos.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dadosCompostos), 'Produtos Compostos');
      XLSX.writeFile(wb, `custos_produtos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      showError({ title: "Erro ao gerar Excel", description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Custo do Produto</h1>
      </div>

      <Tabs defaultValue="simples" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="simples">Produto Simples</TabsTrigger>
          <TabsTrigger value="composto">Produto Composto</TabsTrigger>
        </TabsList>

        <TabsContent value="simples" className="space-y-4">
          <p className="text-slate-500 text-sm">{itensFiltrados.length} produto(s) encontrado(s)</p>
          <div className="flex gap-2 items-end justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative max-w-sm">
                <Input className="pl-9" placeholder="Buscar por código, nome ou artigo..." value={busca} onChange={e => setBusca(e.target.value)} />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <Button variant={filtroCustoZero ? "default" : "outline"} size="sm" className={cn("gap-1.5 shrink-0", filtroCustoZero && "bg-amber-500 hover:bg-amber-600 border-amber-500")} onClick={() => setFiltroCustoZero(v => !v)}>
                <Filter className="h-3.5 w-3.5" /> Custo zero
              </Button>
              <Button variant={filtroSemConsumo ? "default" : "outline"} size="sm" className={cn("gap-1.5 shrink-0", filtroSemConsumo && "bg-orange-500 hover:bg-orange-600 border-orange-500")} onClick={() => setFiltroSemConsumo(v => !v)}>
                <Filter className="h-3.5 w-3.5" /> Sem consumo
              </Button>
              <Button variant={filtroInativos ? "default" : "outline"} size="sm" className={cn("gap-1.5 shrink-0", filtroInativos && "bg-slate-600 hover:bg-slate-700 border-slate-600")} onClick={() => setFiltroInativos(v => !v)}>
                <Filter className="h-3.5 w-3.5" /> Inativos
              </Button>
            </div>
            <Button onClick={gerarExcel} variant="outline" className="gap-2 shrink-0">
              <FileJson className="h-4 w-4" /> Baixar Excel
            </Button>
          </div>
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando dados...</span>
              </div>
            ) : itensFiltrados.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                Nenhum dado sincronizado. Execute a sincronização na aba de Rendimentos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {TABLE_HEADER}
                  <tbody>
                    {itensPaginadosSimples.map((item, idx) => (
                      <ItemRow key={item.id || item.codigo_unico} item={item} indice={(paginaSimples - 1) * PER_PAGE + idx + 1} onAprovarCusto={handleAprovarCusto} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Paginacao pagina={paginaSimples} total={itensFiltrados.length} perPage={PER_PAGE} onChange={setPaginaSimples} />
        </TabsContent>

        <TabsContent value="composto" className="space-y-4">
          <p className="text-slate-500 text-sm">{totalCompostos} produto(s) encontrado(s)</p>
          <div className="flex gap-2 items-end justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative max-w-sm">
                <Input className="pl-9" placeholder="Buscar por código, nome ou artigo..." value={buscaComposto} onChange={e => setBuscaComposto(e.target.value)} />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <Button variant={filtroCustoZeroComposto ? "default" : "outline"} size="sm" className={cn("gap-1.5 shrink-0", filtroCustoZeroComposto && "bg-amber-500 hover:bg-amber-600 border-amber-500")} onClick={() => setFiltroCustoZeroComposto(v => !v)}>
                <Filter className="h-3.5 w-3.5" /> Custo zero
              </Button>
              <Button variant={filtroSemConsumoComposto ? "default" : "outline"} size="sm" className={cn("gap-1.5 shrink-0", filtroSemConsumoComposto && "bg-orange-500 hover:bg-orange-600 border-orange-500")} onClick={() => setFiltroSemConsumoComposto(v => !v)}>
                <Filter className="h-3.5 w-3.5" /> Sem consumo
              </Button>
              <Button variant={filtroInativosComposto ? "default" : "outline"} size="sm" className={cn("gap-1.5 shrink-0", filtroInativosComposto && "bg-slate-600 hover:bg-slate-700 border-slate-600")} onClick={() => setFiltroInativosComposto(v => !v)}>
                <Filter className="h-3.5 w-3.5" /> Inativos
              </Button>
            </div>
            <Button onClick={gerarExcel} variant="outline" className="gap-2 shrink-0">
              <FileJson className="h-4 w-4" /> Baixar Excel
            </Button>
          </div>
          <TabelaProdutoComposto precosData={dataCompostos} isLoading={isLoading} onAprovarCusto={handleAprovarCusto} busca={buscaComposto} onTotalChange={setTotalCompostos} filtroCustoZero={filtroCustoZeroComposto} filtroSemConsumo={filtroSemConsumoComposto} filtroInativos={filtroInativosComposto} />
        </TabsContent>
      </Tabs>

      <ModalConfirmacaoCusto
        open={modalCusto.open}
        onClose={() => setModalCusto({ open: false, codigoUnico: null, produtoId: null, custoAtual: null, descricaoArtigo: null })}
        codigoUnico={modalCusto.codigoUnico}
        produtoId={modalCusto.produtoId}
        descricaoArtigo={modalCusto.descricaoArtigo}
        custoAtual={modalCusto.custoAtual}
        onSalvar={handleSalvarCusto}
        salvando={salvando}
      />
    </div>
  );
}