import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { supabase } from "@/components/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ErpTableContainer } from "@/components/design-system";
import { toast } from "sonner";

// ─── Setores de produção (preparado para carga dinâmica futura) ────────────
const SETORES_PRODUCAO = [
  "Corte",
  "Costura",
  "Estamparia",
  "Bordado",
  "Acabamento",
  "Embalagem",
  "Expedição",
  "Qualidade",
];

// ─── Serviços de API ───────────────────────────────────────────────────────

async function fetchServicos(empresa_id) {
  if (!empresa_id) return [];
  const { data } = await supabase.from("servicos").select("*").eq("empresa_id", empresa_id).is("deleted_at", null);
  return data || [];
}

async function createServico(empresa_id, payload) {
  if (!empresa_id) throw new Error("Empresa ID obrigatório");
  const { data, error } = await supabase.from("servicos").insert({ ...payload, empresa_id, status: "ativo", data_criacao: new Date().toISOString() }).select().single();
  if (error) throw new Error(error.message);
  return data || {};
}

async function updateServico(id, payload) {
  const { data, error } = await supabase.from("servicos").update(payload).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data || {};
}

async function deleteServico(id) {
  await supabase.from("servicos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

// ─── Página Principal ──────────────────────────────────────────────────────

const EMPTY_FORM = { nome_servico: "", descricao: "", setor_producao: "", status: "ativo" };

export default function ServicosPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ["servicos", empresa_id],
    queryFn: () => fetchServicos(empresa_id),
    enabled: !!empresa_id,
    staleTime: Infinity,
  });

  const filtered = useMemo(() => {
    if (!searchTerm) return servicos;
    const t = searchTerm.toLowerCase();
    return servicos.filter((s) =>
      s.codigo_servico?.toLowerCase().includes(t) ||
      s.nome_servico?.toLowerCase().includes(t) ||
      s.descricao?.toLowerCase().includes(t)
    );
  }, [servicos, searchTerm]);

  const criarMutation = useMutation({
    mutationFn: (d) => createServico(empresa_id, d),
    onSuccess: () => {
      qc.invalidateQueries(["servicos"]);
      toast.success("Serviço criado com sucesso!");
      closeModal();
    },
    onError: (err) => toast.error(`Erro ao criar serviço: ${err.message}`),
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, d }) => updateServico(id, d),
    onSuccess: () => {
      qc.invalidateQueries(["servicos"]);
      toast.success("Serviço atualizado com sucesso!");
      closeModal();
    },
    onError: (err) => toast.error(`Erro ao atualizar serviço: ${err.message}`),
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => deleteServico(id),
    onSuccess: () => {
      qc.invalidateQueries(["servicos"]);
      toast.success("Serviço excluído com sucesso!");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(`Erro ao excluir serviço: ${err.message}`),
  });

  const closeModal = () => {
    setModalOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (row) => {
    setFormData({
      nome_servico: row.nome_servico || "",
      descricao: row.descricao || "",
      setor_producao: row.setor_producao || "",
      status: row.status || "ativo",
    });
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome_servico?.trim()) {
      toast.error("Nome do serviço é obrigatório.");
      return;
    }
    if (editingId) {
      editarMutation.mutate({ id: editingId, d: formData });
    } else {
      criarMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOPO */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Serviços</h1>
        <p className="text-sm text-slate-500 mt-0.5">{servicos.length} serviço(s) cadastrado(s)</p>
      </div>

      {/* BUSCA + BOTÃO */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Input
            className="pl-9"
            placeholder="Buscar por código, nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <div className="flex-1" />
        <Button
          onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setModalOpen(true); }}
          className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0"
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      {/* TABELA */}
      <ErpTableContainer>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Código</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Serviço</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Descrição</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Setor de Produção</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Data de Criação</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Carregando...</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum serviço cadastrado ainda.</td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr
                key={s.id}
                className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleEdit(s)}
              >
                <td className="px-4 py-3 font-mono font-semibold text-slate-700">{s.codigo_servico || "—"}</td>
                <td className="px-4 py-3 font-medium">{s.nome_servico}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{s.descricao || "—"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{s.setor_producao || "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    s.status === "ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {s.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {s.data_criacao ? new Date(s.data_criacao).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-1.5 hover:bg-amber-100 rounded transition-colors text-amber-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ErpTableContainer>

      {/* MODAL CRIAR / EDITAR */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Serviço" : "Adicionar novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Código somente leitura */}
            {editingId && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Código do Serviço</label>
                <div className="px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-600">
                  {servicos.find((s) => s.id === editingId)?.codigo_servico || "Gerado automaticamente"}
                </div>
              </div>
            )}
            {!editingId && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Código do Serviço</label>
                <div className="px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-500">
                  Gerado automaticamente (SE01, SE02…)
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Nome do Serviço *</label>
              <Input
                value={formData.nome_servico}
                onChange={(e) => setFormData((p) => ({ ...p, nome_servico: e.target.value }))}
                placeholder="Ex: Bordado Computadorizado"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Descrição</label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição complementar"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Setor de Produção</label>
              <Select
                value={formData.setor_producao || ""}
                onValueChange={(v) => setFormData((p) => ({ ...p, setor_producao: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES_PRODUCAO.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingId && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Status</label>
                <Select
                  value={formData.status || "ativo"}
                  onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={criarMutation.isPending || editarMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{deleteTarget?.nome_servico}</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletarMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}