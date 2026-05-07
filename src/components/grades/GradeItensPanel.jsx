import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, ToggleLeft, ToggleRight, ArrowLeft } from "lucide-react";
import { useGradesTamanhoItens } from "@/hooks/useGradesTamanhoItens";
import { itemFormVazio } from "@/domain/gradesTamanhoItensDomain";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { useTamanhos } from "@/hooks/useTamanhos";

export default function GradeItensPanel({ grade, onVoltar }) {
  const { itens, loading, criar, atualizar, remover, toggleAtivo } = useGradesTamanhoItens(grade?.id);
  const { tamanhos, loading: tamanhosLoading } = useTamanhos();
  const { showSuccess, showError } = useGlobalAlert();

  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(itemFormVazio);
  const [saving, setSaving] = useState(false);

  // Tamanhos ativos disponíveis para seleção
  const tamanhosAtivos = tamanhos.filter(t => t.ativo !== false);

  // Tamanho selecionado no form atual
  const tamanhoSelecionado = tamanhosAtivos.find(t => t.id === form.tamanho_id) || null;

  const abrirModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      // Detecta se o título é customizado (diferente do código do tamanho)
      const tamanhoDoItem = item.tamanhos || tamanhosAtivos.find(t => t.id === item.tamanho_id);
      const codigoTamanho = tamanhoDoItem?.codigo || "";
      const tituloVisual = item.titulo !== codigoTamanho ? (item.titulo || "") : "";
      setForm({
        tamanho_id: item.tamanho_id || "",
        titulo_visual: tituloVisual,
        ordem: item.ordem ?? "",
        ativo: item.ativo !== false,
      });
    } else {
      setEditingId(null);
      const proxOrdem = itens.length > 0 ? Math.max(...itens.map(i => i.ordem || 0)) + 1 : 1;
      setForm({ ...itemFormVazio, ordem: String(proxOrdem) });
    }
    setModal(true);
  };

  const fecharModal = () => {
    setModal(false);
    setEditingId(null);
    setForm(itemFormVazio);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await atualizar(editingId, form, tamanhoSelecionado);
        showSuccess({ title: "Atualizado", description: "Item atualizado com sucesso." });
      } else {
        await criar(form, tamanhoSelecionado);
        showSuccess({ title: "Sucesso", description: "Item adicionado com sucesso." });
      }
      fecharModal();
    } catch (err) {
      showError({ title: "Erro ao salvar", description: err.message });
    }
    setSaving(false);
  };

  const handleDesativar = (item) => {
    handleToggle(item.id, item.ativo);
  };

  const handleToggle = async (id, ativo) => {
    try {
      await toggleAtivo(id, ativo);
      showSuccess({ title: "Atualizado", description: `Item ${ativo ? "desativado" : "ativado"}.` });
    } catch (err) {
      showError({ title: "Erro", description: err.message });
    }
  };

  // Resolve exibição do código do tamanho na listagem
  const getCodigoTamanho = (item) => {
    return item.tamanhos?.codigo || tamanhosAtivos.find(t => t.id === item.tamanho_id)?.codigo || "—";
  };

  return (
    <div className="space-y-4">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="text-slate-500 hover:text-slate-700 gap-1 px-2">
            <ArrowLeft className="h-4 w-4" />
            Grades
          </Button>
          <span className="text-slate-300">/</span>
          <div>
            <span className="font-semibold text-slate-800">{grade?.nome_grade}</span>
            <span className="ml-2 text-xs text-slate-400">— itens da grade</span>
          </div>
        </div>
        <Button onClick={() => abrirModal()} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo Item
        </Button>
      </div>

      {/* Tabela de itens */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Tamanho Global</TableHead>
              <TableHead>Título Visual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Nenhum item cadastrado nesta grade
                </TableCell>
              </TableRow>
            ) : (
              itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-slate-500 text-sm">{item.ordem ?? "—"}</TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold text-slate-800">{getCodigoTamanho(item)}</span>
                  </TableCell>
                  <TableCell className="text-slate-600">{item.titulo || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm" variant="ghost"
                      className="text-slate-400 hover:text-blue-600"
                      title={item.ativo ? "Desativar" : "Ativar"}
                      onClick={() => handleDesativar(item)}
                      >
                      {item.ativo
                        ? <ToggleRight className="h-16 w-16 text-green-500" />
                        : <ToggleLeft className="h-16 w-16 text-slate-400" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600" onClick={() => abrirModal(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de item */}
      <Dialog open={modal} onOpenChange={(v) => { if (!v) fecharModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Item da Grade" : "Novo Item da Grade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Tamanho Global — obrigatório */}
            <div>
              <label className="text-sm font-medium">Tamanho Global *</label>
              <select
                value={form.tamanho_id}
                onChange={e => setForm(p => ({ ...p, tamanho_id: e.target.value }))}
                className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={tamanhosLoading}
              >
                <option value="">Selecione um tamanho global...</option>
                {tamanhosAtivos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.descricao}
                  </option>
                ))}
              </select>
              {tamanhosAtivos.length === 0 && !tamanhosLoading && (
                <p className="text-xs text-amber-600 mt-1">
                  Nenhum tamanho global ativo cadastrado. Cadastre primeiro na seção "Tamanhos Globais".
                </p>
              )}
            </div>

            {/* Título Visual — opcional */}
            <div>
              <label className="text-sm font-medium">
                Título Visual
                <span className="ml-1 text-slate-400 font-normal text-xs">(opcional)</span>
              </label>
              <Input
                value={form.titulo_visual}
                onChange={e => setForm(p => ({ ...p, titulo_visual: e.target.value }))}
                placeholder={tamanhoSelecionado ? `Padrão: ${tamanhoSelecionado.codigo}` : "Selecione um tamanho global primeiro"}
                className="mt-1"
                autoComplete="off"
              />
              <p className="text-xs text-slate-400 mt-1">
                Se vazio, será usado automaticamente o código do tamanho global.
              </p>
            </div>

            {/* Ordem */}
            <div>
              <label className="text-sm font-medium">Ordem</label>
              <Input
                type="number"
                min="0"
                value={form.ordem}
                onChange={e => setForm(p => ({ ...p, ordem: e.target.value }))}
                placeholder="Ex: 1"
                className="mt-1"
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Ativo</label>
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={form.ativo}
                onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : editingId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}