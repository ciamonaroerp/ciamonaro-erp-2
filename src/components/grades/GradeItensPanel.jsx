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
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight, ArrowLeft } from "lucide-react";
import { useGradesTamanhoItens } from "@/hooks/useGradesTamanhoItens";
import { itemFormVazio } from "@/domain/gradesTamanhoItensDomain";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

export default function GradeItensPanel({ grade, onVoltar }) {
  const { itens, loading, criar, atualizar, remover, toggleAtivo } = useGradesTamanhoItens(grade?.id);
  const { showSuccess, showError, showConfirm } = useGlobalAlert();

  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(itemFormVazio);
  const [saving, setSaving] = useState(false);

  const abrirModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setForm({ titulo: item.titulo || "", ordem: item.ordem ?? "", ativo: item.ativo !== false });
    } else {
      setEditingId(null);
      // Sugere próxima ordem automaticamente
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
        await atualizar(editingId, form);
        showSuccess({ title: "Atualizado", description: "Item atualizado com sucesso." });
      } else {
        await criar(form);
        showSuccess({ title: "Sucesso", description: "Item adicionado com sucesso." });
      }
      fecharModal();
    } catch (err) {
      showError({ title: "Erro ao salvar", description: err.message });
    }
    setSaving(false);
  };

  const handleRemover = (id) => {
    showConfirm({
      title: "Remover item?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await remover(id);
          showSuccess({ title: "Removido", description: "Item removido com sucesso." });
        } catch (err) {
          showError({ title: "Erro ao remover", description: err.message });
        }
      },
    });
  };

  const handleToggle = async (id, ativo) => {
    try {
      await toggleAtivo(id, ativo);
      showSuccess({ title: "Atualizado", description: `Item ${ativo ? "desativado" : "ativado"}.` });
    } catch (err) {
      showError({ title: "Erro", description: err.message });
    }
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
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  Nenhum item cadastrado nesta grade
                </TableCell>
              </TableRow>
            ) : (
              itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-slate-500 text-sm">{item.ordem ?? "—"}</TableCell>
                  <TableCell className="font-medium">{item.titulo}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-blue-600" title={item.ativo ? "Desativar" : "Ativar"} onClick={() => handleToggle(item.id, item.ativo)}>
                      {item.ativo
                        ? <ToggleRight className="h-4 w-4 text-green-500" />
                        : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600" onClick={() => abrirModal(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-500" onClick={() => handleRemover(item.id)}>
                      <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editingId ? "Editar Item" : "Novo Item da Grade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: P, M, G, GG ou 02, 04, 06..."
                className="mt-1"
                autoComplete="off"
              />
            </div>
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