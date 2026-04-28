import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Pencil, Trash2, Loader2, Copy } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { supabase } from "@/components/lib/supabaseClient";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const callCRUD = async (action, table, data = null, id = null, empresa_id = null) => {
  let q;
  if (action === "list") {
    q = supabase.from(table).select("*");
    if (empresa_id) q = q.eq("empresa_id", empresa_id);
  } else if (action === "create") {
    const { data: d, error } = await supabase.from(table).insert(data).select().single();
    if (error) throw new Error(error.message);
    return d;
  } else if (action === "update") {
    const { data: d, error } = await supabase.from(table).update(data).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return d;
  } else if (action === "delete") {
    const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    return null;
  }
  const { data: d, error } = await q;
  if (error) throw new Error(error.message);
  return d || [];
};

const gerarCodigo = (artigo, cor, linha) => {
  if (!artigo || !cor || !linha) return null;
  return `${artigo.codigo_artigo || artigo.id}${cor.codigo_cor || cor.id}${linha.codigo_linha_comercial || linha.id}`;
};

// ─── Status Logic ─────────────────────────────────────────────────────────────

function computeStatus(codigoUnico, nfeItens, estoqueMovs) {
  const nfeMatch = nfeItens.some(item => item?.codigo_unico === codigoUnico);
  const estMatch = estoqueMovs.some(m => m?.codigo_unico === codigoUnico);
  if (estMatch) return "bloqueado";
  if (nfeMatch) return "xml";
  return "sem_uso";
}

const STATUS_CONFIG = {
  sem_uso: { label: "Sem uso", variant: "outline" },
  xml: { label: "Vinculado ao XML", variant: "secondary" },
  estoque: { label: "Em uso no estoque", variant: "default" },
  bloqueado: { label: "Bloqueado", variant: "destructive" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CodigoUnicoTab({ empresa_id, artigosArray, coresArray, linhasArray }) {
  const queryClient = useQueryClient();
  const { showError, showSuccess, showDelete } = useGlobalAlert();

  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ artigo_id: "", cor_tecido_id: "", linha_comercial_id: "" });
  const [saving, setSaving] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const vinculosQuery = useQuery({
    queryKey: ["config-vinculos-cadastro", empresa_id],
    queryFn: () => callCRUD("list", "config_vinculos", null, null, empresa_id),
    enabled: !!empresa_id,
  });

  const nfeQuery = useQuery({
    queryKey: ["nfe-importadas", empresa_id],
    queryFn: () => callCRUD("list", "nota_fiscal_importada", null, null, empresa_id),
    enabled: !!empresa_id,
  });

  const estoqueQuery = useQuery({
    queryKey: ["estoque-movimentacoes", empresa_id],
    queryFn: async () => {
      try {
        return await callCRUD("list", "estoque_movimentacoes", null, null, empresa_id);
      } catch {
        return [];
      }
    },
    enabled: !!empresa_id,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const vinculos = useMemo(() =>
    (vinculosQuery.data || []).filter(v => !v.deleted_at),
    [vinculosQuery.data]
  );

  // Collect all codigo_unico references from NFe: nested itens (stored as JSON string or array)
  const nfeCodigosEmUso = useMemo(() => {
    const all = nfeQuery.data || [];
    const codigos = new Set();
    all.forEach(nfe => {
      // Top-level field (fallback)
      if (nfe.codigo_unico) codigos.add(nfe.codigo_unico);
      // itens pode ser string JSON ou array
      let itens = nfe.itens;
      if (typeof itens === 'string') {
        try { itens = JSON.parse(itens); } catch { itens = []; }
      }
      if (Array.isArray(itens)) {
        itens.forEach(item => {
          if (item?.codigo_unico) codigos.add(item.codigo_unico);
        });
      }
    });
    return codigos;
  }, [nfeQuery.data]);

  // Keep flat list for the view modal (parse JSON string if needed)
  const nfeItens = useMemo(() => {
    const all = nfeQuery.data || [];
    return all.flatMap(nfe => {
      let itens = nfe.itens;
      if (typeof itens === 'string') {
        try { itens = JSON.parse(itens); } catch { return []; }
      }
      return Array.isArray(itens) ? itens : [];
    });
  }, [nfeQuery.data]);

  const estoqueMovs = useMemo(() => estoqueQuery.data || [], [estoqueQuery.data]);

  const isLoading = vinculosQuery.isLoading || nfeQuery.isLoading;

  // ── View helpers ───────────────────────────────────────────────────────────

  const getStatusFor = (codigoUnico) => {
    const estMatch = estoqueMovs.some(m => m?.codigo_unico === codigoUnico);
    if (estMatch) return "bloqueado";
    if (nfeCodigosEmUso.has(codigoUnico)) return "xml";
    return "sem_uso";
  };

  const getNfeForCodigo = (codigoUnico) =>
    nfeItens.filter(item => item?.codigo_unico === codigoUnico);

  const getLabel = (arr, id, field) => arr.find(x => x.id === id)?.[field] || "-";

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEdit = (item) => {
    const status = getStatusFor(item.codigo_unico);
    if (status !== "sem_uso") {
      showError({
        title: "Edição não permitida",
        message: "Este código já está em uso e não pode ser alterado.",
      });
      return;
    }
    setEditItem(item);
    setEditForm({
      artigo_id: item.artigo_id,
      cor_tecido_id: item.cor_tecido_id,
      linha_comercial_id: item.linha_comercial_id,
    });
  };

  const handleSaveEdit = async () => {
    const { artigo_id, cor_tecido_id, linha_comercial_id } = editForm;
    if (!artigo_id || !cor_tecido_id || !linha_comercial_id) {
      showError({ title: "Campos obrigatórios", message: "Selecione artigo, cor e linha comercial." });
      return;
    }
    const artigo = artigosArray.find(a => a.id === artigo_id);
    const cor = coresArray.find(c => c.id === cor_tecido_id);
    const linha = linhasArray.find(l => l.id === linha_comercial_id);
    const novo_codigo = gerarCodigo(artigo, cor, linha);

    // Check duplicate
    const duplicado = vinculos.find(v => v.codigo_unico === novo_codigo && v.id !== editItem.id);
    if (duplicado) {
      showError({ title: "Duplicidade", message: `Combinação já existente: ${duplicado.codigo_unico}` });
      return;
    }

    setSaving(true);
    try {
      // Gera descricao_comercial_unificada
      const descricaoComercialUnificada = [artigo?.nome_artigo || '', cor?.cor_nome || ''].join(' ').trim() || null;
      await callCRUD("update", "config_vinculos", { codigo_unico: novo_codigo, artigo_nome_comercial: artigo?.nome_artigo || "", cor_nome_comercial: cor?.cor_nome || "", linha_comercial_nome: linha?.nome_linha_comercial || "", artigo_codigo: artigo?.codigo_artigo || "", cor_codigo: cor?.codigo_cor || "", linha_codigo: linha?.codigo_linha_comercial || "", descricao_comercial_unificada: descricaoComercialUnificada }, editItem.id);
      queryClient.invalidateQueries({ queryKey: ["config-vinculos-cadastro", empresa_id] });
      showSuccess({ title: "Atualizado", message: `Código ${novo_codigo} atualizado com sucesso!` });
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    const status = getStatusFor(item.codigo_unico);
    if (status !== "sem_uso") {
      showError({
        title: "Exclusão não permitida",
        message: "Este código já foi utilizado e não pode ser excluído.",
      });
      return;
    }
    showDelete({
      title: "Confirmar exclusão",
      message: `Deseja inativar o código ${item.codigo_unico}?`,
      onConfirm: async () => {
        try {
          await callCRUD("delete", "config_vinculos", null, item.id, empresa_id);
          queryClient.invalidateQueries({ queryKey: ["config-vinculos-cadastro", empresa_id] });
          toast.success("Código inativado com sucesso!");
        } catch (err) {
          const msg = err?.response?.data?.error || err?.message || "Erro ao excluir";
          showError({ title: "Exclusão bloqueada", message: msg });
        }
      },
    });
  };

  const handleNovoCodigo = () => {
    setEditItem({ _novo: true });
    setEditForm({ artigo_id: "", cor_tecido_id: "", linha_comercial_id: "" });
  };

  const handleSaveNovo = async () => {
    const { artigo_id, cor_tecido_id, linha_comercial_id } = editForm;
    if (!artigo_id || !cor_tecido_id || !linha_comercial_id) {
      showError({ title: "Campos obrigatórios", message: "Selecione artigo, cor e linha comercial." });
      return;
    }
    const artigo = artigosArray.find(a => a.id === artigo_id);
    const cor = coresArray.find(c => c.id === cor_tecido_id);
    const linha = linhasArray.find(l => l.id === linha_comercial_id);
    const codigo_unico = gerarCodigo(artigo, cor, linha);

    const duplicado = vinculos.find(v => v.codigo_unico === codigo_unico);
    if (duplicado) {
      showError({ title: "Duplicidade", message: `Código já existente: ${duplicado.codigo_unico}` });
      return;
    }

    setSaving(true);
    try {
      // Gera descricao_comercial_unificada
      const descricaoComercialUnificada = [artigo?.nome_artigo || '', cor?.cor_nome || ''].join(' ').trim() || null;
      await callCRUD("create", "config_vinculos", { empresa_id, codigo_unico, artigo_nome_comercial: artigo?.nome_artigo || "", cor_nome_comercial: cor?.cor_nome || "", linha_comercial_nome: linha?.nome_linha_comercial || "", artigo_codigo: artigo?.codigo_artigo || "", cor_codigo: cor?.codigo_cor || "", linha_codigo: linha?.codigo_linha_comercial || "", descricao_comercial_unificada: descricaoComercialUnificada });
      queryClient.invalidateQueries({ queryKey: ["config-vinculos-cadastro", empresa_id] });
      showSuccess({ title: "Cadastrado", message: `Código ${codigo_unico} criado com sucesso!` });
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  const codigoPreview = gerarCodigo(
    artigosArray.find(a => a.id === editForm.artigo_id),
    coresArray.find(c => c.id === editForm.cor_tecido_id),
    linhasArray.find(l => l.id === editForm.linha_comercial_id),
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{vinculos.length} código(s) cadastrado(s)</p>
        <Button onClick={handleNovoCodigo} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Novo Código
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código Único</TableHead>
              <TableHead>Artigo</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Linha Comercial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : vinculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nenhum código cadastrado
                </TableCell>
              </TableRow>
            ) : vinculos.map((t) => {
              const status = getStatusFor(t.codigo_unico);
              const sc = STATUS_CONFIG[status] || STATUS_CONFIG.sem_uso;
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">{t.codigo_unico}</span>
                      <Button
                        size="icon" variant="ghost"
                        className="h-6 w-6 text-slate-400 hover:text-blue-600"
                        onClick={() => { navigator.clipboard.writeText(t.codigo_unico); toast.success("Copiado!"); }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{t.artigo_nome_comercial || getLabel(artigosArray, t.artigo_id, "nome_artigo")}</TableCell>
                  <TableCell>{t.cor_nome_comercial || getLabel(coresArray, t.cor_tecido_id, "cor_nome")}</TableCell>
                  <TableCell>{t.linha_comercial_nome || getLabel(linhasArray, t.linha_comercial_id, "nome_linha_comercial")}</TableCell>
                  <TableCell>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => setViewItem(t)} title="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-600" onClick={() => handleEdit(t)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(t)} title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* ── MODAL VISUALIZAR ─────────────────────────────────────────── */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Código Único — {viewItem?.codigo_unico}</DialogTitle>
          </DialogHeader>
          {viewItem && (() => {
            const nfeItems = getNfeForCodigo(viewItem.codigo_unico);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg text-sm">
                  <div><span className="text-slate-500">Artigo</span><p className="font-medium">{viewItem.artigo_nome_comercial || "-"}</p></div>
                  <div><span className="text-slate-500">Cor</span><p className="font-medium">{viewItem.cor_nome_comercial || "-"}</p></div>
                  <div><span className="text-slate-500">Linha</span><p className="font-medium">{viewItem.linha_comercial_nome || "-"}</p></div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Itens de XML vinculados ({nfeItems.length})
                  </p>
                  {nfeItems.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Nenhum item de XML vinculado a este código.</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-28">Descrição</TableHead>
                            <TableHead>Complementar</TableHead>
                            <TableHead className="w-20">Pedido</TableHead>
                            <TableHead className="text-right w-16">Qtd</TableHead>
                            <TableHead className="text-right w-24">Valor Unit.</TableHead>
                            <TableHead className="text-right w-24">Valor Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nfeItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs align-top">{item.descricao_base || item.xProd || "-"}</TableCell>
                              <TableCell className="text-xs text-slate-500 align-top max-w-xs">
                                <div className="break-all whitespace-normal">{item.descricao_complementar || item.infAdProd || "-"}</div>
                              </TableCell>
                              <TableCell className="text-xs align-top">{item.codigo_pedido || item.xPed || "-"}</TableCell>
                              <TableCell className="text-xs text-right align-top">{item.quantidade ?? item.qCom ?? "-"}</TableCell>
                              <TableCell className="text-xs text-right align-top">
                                {item.valor_unitario != null
                                  ? `R$ ${Number(item.valor_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                  : item.vUnCom != null
                                  ? `R$ ${Number(item.vUnCom).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-xs text-right align-top">
                                {item.valor_total != null
                                  ? `R$ ${Number(item.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL EDITAR / NOVO ──────────────────────────────────────── */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem?._novo ? "Novo Código Único" : "Editar Código Único"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Artigo *</label>
              <Select value={editForm.artigo_id} onValueChange={(v) => setEditForm({ ...editForm, artigo_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{artigosArray.map(a => <SelectItem key={a.id} value={a.id}>{a.nome_artigo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Cor do Tecido *</label>
              <Select value={editForm.cor_tecido_id} onValueChange={(v) => setEditForm({ ...editForm, cor_tecido_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{coresArray.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cor}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Linha Comercial *</label>
              <Select value={editForm.linha_comercial_id} onValueChange={(v) => setEditForm({ ...editForm, linha_comercial_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{linhasArray.map(l => <SelectItem key={l.id} value={l.id}>{l.nome_linha_comercial}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Código Único (gerado automaticamente)</label>
              <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono">
                {codigoPreview
                  ? <span className="font-bold text-blue-700">{codigoPreview}</span>
                  : <span className="text-slate-400">Selecione artigo, cor e linha para gerar</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} disabled={saving}>Cancelar</Button>
            <Button
              onClick={editItem?._novo ? handleSaveNovo : handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saving || !codigoPreview}
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : editItem?._novo ? "Adicionar" : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}