/**
 * CIAMONARO ERP — Financeiro > Configurações Gerais
 * Aba 1: Formas de Pagamento (CRUD completo com soft delete)
 * Abas 2-5: Reservadas para expansão futura
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpPageLayout from "@/components/design-system/ErpPageLayout";
import ErpTable from "@/components/erp/ErpTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { format } from "date-fns";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inativo: "bg-red-50 text-red-700 border-red-200",
};

// ─── Colunas da tabela ────────────────────────────────────────────────────────

const COLUNAS_FORMAS = [
  { key: "codigo_forma_pagamento", label: "Código", render: (v) => <span className="font-mono text-xs text-slate-500">{v || "—"}</span> },
  { key: "forma_pagamento", label: "Forma de Pagamento", render: (v) => <span className="font-medium text-slate-800">{v}</span> },
  { key: "descricao", label: "Descrição", render: (v) => v || "—" },
  { key: "observacao", label: "Observação", render: (v) => v || "—" },
  {
    key: "status", label: "Status", render: (v) => (
      <Badge className={`text-xs font-medium border ${STATUS_BADGE[v] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{v || "—"}</Badge>
    )
  },
  { key: "created_at", label: "Data de Criação", render: (v) => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
];

// ─── Modal Forma de Pagamento ─────────────────────────────────────────────────

function FormaModal({ open, onClose, dados, onChange, onSubmit, isSubmitting, isEditing }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEditing ? "Editar forma de pagamento" : "Nova forma de pagamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Código — somente leitura, exibe o gerado pelo banco */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Código</Label>
              <Input
                value={dados.codigo_forma_pagamento || ""}
                readOnly
                disabled
                className="bg-slate-50 h-9 text-slate-500 font-mono"
                placeholder=""
              />
            </div>

            {/* Forma de pagamento */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Forma de Pagamento *</Label>
              <Input
                value={dados.forma_pagamento || ""}
                onChange={(e) => onChange("forma_pagamento", e.target.value)}
                required
                className="bg-white h-9"
                placeholder=""
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm font-medium text-slate-700">Descrição</Label>
              <Input
                value={dados.descricao || ""}
                onChange={(e) => onChange("descricao", e.target.value)}
                className="bg-white h-9"
                placeholder=""
              />
            </div>

            {/* Observação */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm font-medium text-slate-700">Observação</Label>
              <textarea
                value={dados.observacao || ""}
                onChange={(e) => onChange("observacao", e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder=""
              />
            </div>

            {/* Status — apenas no editar */}
            {isEditing && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Status</Label>
                <Select value={dados.status || "ativo"} onValueChange={(v) => onChange("status", v)}>
                  <SelectTrigger className="bg-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} style={{ background: '#3B5CCC' }} className="text-white min-w-[120px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aba: Formas de Pagamento ─────────────────────────────────────────────────

function FormasPagamento({ empresaId }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: formas = [], isLoading } = useQuery({
    queryKey: ["fin-formas-pagamento", empresaId],
    queryFn: async () => {
      if (!supabase || !empresaId) return [];
      const { data } = await supabase.from("fin_formas_pagamento").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const criarMutation = useMutation({
    mutationFn: async (dados) => {
      const { error } = await supabase.from("fin_formas_pagamento").insert({ ...dados, status: "ativo", empresa_id: empresaId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["fin-formas-pagamento"]); closeModal(); },
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      const { error } = await supabase.from("fin_formas_pagamento").update(dados).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["fin-formas-pagamento"]); closeModal(); },
  });

  const deletarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("fin_formas_pagamento").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["fin-formas-pagamento"]); setDeleteTarget(null); },
  });

  const closeModal = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  const handleEditar = (row) => { setFormData({ ...row }); setEditingId(row.id); setModalOpen(true); };

  const handleSubmit = () => {
    if (editingId) {
      editarMutation.mutate({ id: editingId, dados: formData });
    } else {
      criarMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => { setFormData({}); setEditingId(null); setModalOpen(true); }}
          style={{ background: '#3B5CCC' }}
          className="text-white gap-2 rounded-lg"
        >
          <Plus className="h-4 w-4" /> Nova forma de pagamento
        </Button>
      </div>

      <ErpTable
        titulo="Formas de Pagamento"
        colunas={COLUNAS_FORMAS}
        dados={formas}
        isLoading={isLoading}
        campoBusca="forma_pagamento"
        onEditar={handleEditar}
        showSearchBar={true}
        acoes={[
          { titulo: "Excluir", icone: Trash2, className: "hover:text-red-600", onClick: (row) => setDeleteTarget({ id: row.id, nome: row.forma_pagamento }) },
        ]}
      />

      <FormaModal
        open={modalOpen}
        onClose={setModalOpen}
        dados={formData}
        onChange={(key, val) => setFormData(prev => ({ ...prev, [key]: val }))}
        onSubmit={handleSubmit}
        isSubmitting={criarMutation.isPending || editarMutation.isPending}
        isEditing={!!editingId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a forma de pagamento <strong>{deleteTarget?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletarMutation.mutate(deleteTarget?.id)}
              disabled={deletarMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Modal Centro de Custo ───────────────────────────────────────────────────

function CentroCustoModal({ open, onClose, dados, onChange, onSubmit, isSubmitting, isEditing }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEditing ? "Editar centro de custo" : "Novo centro de custo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Descrição *</Label>
            <Input
              value={dados.descricao || ""}
              onChange={(e) => onChange("descricao", e.target.value)}
              required
              className="bg-white h-9"
              placeholder=""
            />
          </div>
          {isEditing && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <Select value={dados.ativo === false ? "inativo" : "ativo"} onValueChange={(v) => onChange("ativo", v === "ativo")}>
                <SelectTrigger className="bg-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} style={{ background: '#3B5CCC' }} className="text-white min-w-[120px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Placeholder ────────────────────────────────────────────────────────────

function AbaReservada() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
        <Plus className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-slate-400 text-sm font-medium">Em desenvolvimento</p>
    </div>
  );
}

// ─── Aba: Centros de Custo ────────────────────────────────────────────────────

function CentrosCusto({ empresaId }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const { data: centros = [], isLoading } = useQuery({
    queryKey: ["fin-centros-custo", empresaId],
    queryFn: async () => {
      if (!supabase || !empresaId) return [];
      const { data } = await supabase.from("centros_custo").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const criarMutation = useMutation({
    mutationFn: async (dados) => {
      const { error } = await supabase.from("centros_custo").insert({ ...dados, empresa_id: empresaId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["fin-centros-custo"]); closeModal(); },
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      const { error } = await supabase.from("centros_custo").update(dados).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["fin-centros-custo"]); closeModal(); },
  });

  const deletarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("centros_custo").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["fin-centros-custo"]); setDeleteTarget(null); setDeleteError(null); },
    onError: (e) => setDeleteError(e.message),
  });

  const closeModal = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  const handleEditar = (row) => { setFormData({ ...row }); setEditingId(row.id); setModalOpen(true); };

  const handleSubmit = () => {
    if (editingId) editarMutation.mutate({ id: editingId, dados: formData });
    else criarMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => { setFormData({}); setEditingId(null); setModalOpen(true); }}
          style={{ background: '#3B5CCC' }}
          className="text-white gap-2 rounded-lg"
        >
          <Plus className="h-4 w-4" /> Novo centro de custo
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Descrição</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin inline" /></td></tr>
            ) : centros.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-10 text-slate-400 text-sm">Nenhum centro de custo cadastrado.</td></tr>
            ) : centros.map(cc => (
              <tr key={cc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{cc.descricao}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cc.ativo !== false ? STATUS_BADGE.ativo : STATUS_BADGE.inativo}>
                    {cc.ativo !== false ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEditar(cc)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-red-600" onClick={() => { setDeleteTarget({ id: cc.id, nome: cc.descricao }); setDeleteError(null); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CentroCustoModal
        open={modalOpen}
        onClose={setModalOpen}
        dados={formData}
        onChange={(key, val) => setFormData(prev => ({ ...prev, [key]: val }))}
        onSubmit={handleSubmit}
        isSubmitting={criarMutation.isPending || editarMutation.isPending}
        isEditing={!!editingId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o centro de custo <strong>{deleteTarget?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{deleteError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletarMutation.mutate(deleteTarget?.id)}
              disabled={deletarMutation.isPending || !!deleteError}
            >
              {deletarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FinanceiroConfiguracoesPage() {
  const { empresa_id } = useEmpresa();

  return (
    <ErpPageLayout
      title="Configurações Gerais"
      description="Parâmetros e configurações do módulo Financeiro"
    >
      <Tabs defaultValue="formas_pagamento" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="formas_pagamento">Formas de Pagamento</TabsTrigger>
          <TabsTrigger value="centros_custo">Centros de Custo</TabsTrigger>
          <TabsTrigger value="r3" disabled>Em breve</TabsTrigger>
          <TabsTrigger value="r4" disabled>Em breve</TabsTrigger>
          <TabsTrigger value="r5" disabled>Em breve</TabsTrigger>
        </TabsList>

        <TabsContent value="formas_pagamento">
          <FormasPagamento empresaId={empresa_id} />
        </TabsContent>
        <TabsContent value="centros_custo">
          <CentrosCusto empresaId={empresa_id} />
        </TabsContent>
        <TabsContent value="r3"><AbaReservada /></TabsContent>
        <TabsContent value="r4"><AbaReservada /></TabsContent>
        <TabsContent value="r5"><AbaReservada /></TabsContent>
      </Tabs>
    </ErpPageLayout>
  );
}