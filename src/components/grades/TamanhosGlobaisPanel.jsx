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
import { Plus, Pencil, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useTamanhos } from "@/hooks/useTamanhos";
import { tamanhoFormVazio } from "@/domain/tamanhosDomain";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

export default function TamanhosGlobaisPanel() {
  const { tamanhos, loading, criar, atualizar, toggleAtivo } = useTamanhos();
  const { showSuccess, showError } = useGlobalAlert();

  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(tamanhoFormVazio);
  const [saving, setSaving] = useState(false);

  const tamanhosFiltrados = tamanhos.filter(t =>
    t.codigo?.toLowerCase().includes(busca.toLowerCase()) ||
    t.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  const abrirModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setForm({ codigo: item.codigo || "", descricao: item.descricao || "", ativo: item.ativo !== false });
    } else {
      setEditingId(null);
      setForm(tamanhoFormVazio);
    }
    setModal(true);
  };

  const fecharModal = () => {
    setModal(false);
    setEditingId(null);
    setForm(tamanhoFormVazio);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await atualizar(editingId, form);
        showSuccess({ title: "Atualizado", description: "Tamanho atualizado com sucesso." });
      } else {
        await criar(form);
        showSuccess({ title: "Sucesso", description: "Tamanho criado com sucesso." });
      }
      fecharModal();
    } catch (err) {
      showError({ title: "Erro ao salvar", description: err.message });
    }
    setSaving(false);
  };

  const handleToggle = async (id, ativo) => {
    try {
      await toggleAtivo(id, ativo);
      showSuccess({ title: "Atualizado", description: `Tamanho ${ativo ? "desativado" : "ativado"}.` });
    } catch (err) {
      showError({ title: "Erro", description: err.message });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header da seção */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Tamanhos Globais</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamanhos reutilizáveis em todas as grades. Grades diferentes podem compartilhar o mesmo tamanho.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por código..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => abrirModal()} className="gap-2 bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Novo Tamanho
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
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
            ) : tamanhosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  {busca ? "Nenhum tamanho encontrado para esta busca" : "Nenhum tamanho global cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              tamanhosFiltrados.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-semibold text-slate-800">{t.codigo}</TableCell>
                  <TableCell className="text-slate-700">{t.descricao}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {t.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <button
                      className="text-slate-400 hover:text-blue-600 p-1 rounded"
                      title={t.ativo ? "Desativar" : "Ativar"}
                      onClick={() => handleToggle(t.id, t.ativo)}
                      >
                      {t.ativo
                        ? <ToggleRight style={{ width: 32, height: 32 }} className="text-green-500" />
                        : <ToggleLeft style={{ width: 32, height: 32 }} className="text-slate-400" />}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() => abrirModal(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal */}
      <Dialog open={modal} onOpenChange={(v) => { if (!v) fecharModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Tamanho Global" : "Novo Tamanho Global"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Código *</label>
              <Input
                value={form.codigo}
                onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="Ex: PP, P, M, G, GG, 02, 04..."
                className="mt-1 font-mono uppercase"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input
                value={form.descricao}
                onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Ex: Pequeno, Médio, Grande..."
                className="mt-1"
                autoComplete="off"
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
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                : editingId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}