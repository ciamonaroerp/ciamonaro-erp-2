import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/components/context/EmpresaContext";
import * as baseService from "@/components/services/baseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { cn } from "@/lib/utils";
import { ErpTableContainer } from "@/components/design-system";

const EMPTY = { fornecedor_nome: "", fornecedor_cnpj: "", codigo_produto_fornecedor: "", descricao_produto_fornecedor: "", artigo: "", cor: "", status: "Ativo" };

async function fetchVinculos(empresa_id) {
  return baseService.listar("vinculo_cadastro", empresa_id);
}

async function createVinculo(empresa_id, payload) {
  return baseService.criar("vinculo_cadastro", { ...payload, empresa_id });
}

async function updateVinculo(id, payload) {
  return baseService.atualizar("vinculo_cadastro", id, payload);
}

async function deleteVinculo(id) {
  return baseService.deletar("vinculo_cadastro", id);
}

export default function VinculosCadastroPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showError, showDelete } = useGlobalAlert();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  const { data: vinculos = [] } = useQuery({
    queryKey: ["vinculos-cadastro", empresa_id],
    queryFn: () => fetchVinculos(empresa_id),
    enabled: !!empresa_id,
  });

  const filtered = useMemo(() => {
    if (!searchTerm) return vinculos;
    const t = searchTerm.toLowerCase();
    return vinculos.filter(v =>
      v.fornecedor_nome?.toLowerCase().includes(t) ||
      v.codigo_produto_fornecedor?.toLowerCase().includes(t) ||
      v.artigo?.toLowerCase().includes(t) ||
      v.cor?.toLowerCase().includes(t)
    );
  }, [vinculos, searchTerm]);

  const criarMutation = useMutation({
    mutationFn: (d) => createVinculo(empresa_id, d),
    onSuccess: () => { qc.invalidateQueries(["vinculos-cadastro"]); closeModal(); },
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, d }) => updateVinculo(id, d),
    onSuccess: () => { qc.invalidateQueries(["vinculos-cadastro"]); closeModal(); },
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => deleteVinculo(id),
    onSuccess: () => qc.invalidateQueries(["vinculos-cadastro"]),
  });

  const closeModal = () => { setModalOpen(false); setFormData(EMPTY); setEditingId(null); };

  const handleSubmit = () => {
    if (!formData.fornecedor_nome || !formData.codigo_produto_fornecedor || !formData.artigo || !formData.cor) {
      showError({ title: "Campos obrigatórios", description: "Preencha: Fornecedor, Código, Artigo e Cor." });
      return;
    }
    if (editingId) editarMutation.mutate({ id: editingId, d: formData });
    else criarMutation.mutate(formData);
  };

  const handleEdit = (row) => { setFormData(row); setEditingId(row.id); setModalOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vínculos do Cadastro</h1>
          <p className="text-sm text-slate-500 mt-0.5">{vinculos.length} vínculo(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => { setFormData(EMPTY); setEditingId(null); setModalOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Novo Vínculo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Input
          className="pl-9"
          placeholder="Buscar por fornecedor, código, artigo ou cor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
      </div>

      <ErpTableContainer>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Fornecedor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Cód. Produto Fornecedor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Descrição Fornecedor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Artigo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Cor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum vínculo cadastrado ainda.</td></tr>
            )}
            {filtered.map(v => (
              <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium">{v.fornecedor_nome}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.codigo_produto_fornecedor}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{v.descricao_produto_fornecedor || "-"}</td>
                <td className="px-4 py-3 font-medium text-blue-700">{v.artigo}</td>
                <td className="px-4 py-3 text-slate-700">{v.cor}</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-1 rounded text-xs font-medium",
                    v.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleEdit(v)} className="p-1.5 hover:bg-amber-100 rounded transition-colors text-amber-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => showDelete({ title: "Excluir Vínculo", description: `Excluir vínculo "${v.codigo_produto_fornecedor}"? Esta ação não pode ser desfeita.`, onConfirm: () => deletarMutation.mutateAsync(v.id) })} className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ErpTableContainer>

      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Vínculo" : "Novo Vínculo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Fornecedor *</label>
              <Input value={formData.fornecedor_nome || ""} onChange={e => setFormData(p => ({ ...p, fornecedor_nome: e.target.value }))} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">CNPJ do Fornecedor</label>
              <Input value={formData.fornecedor_cnpj || ""} onChange={e => setFormData(p => ({ ...p, fornecedor_cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Código do Produto (Fornecedor) *</label>
              <Input value={formData.codigo_produto_fornecedor || ""} onChange={e => setFormData(p => ({ ...p, codigo_produto_fornecedor: e.target.value }))} placeholder="Código usado pelo fornecedor" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Descrição do Produto (Fornecedor)</label>
              <Input value={formData.descricao_produto_fornecedor || ""} onChange={e => setFormData(p => ({ ...p, descricao_produto_fornecedor: e.target.value }))} placeholder="Como o fornecedor chama o produto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Artigo *</label>
                <Input value={formData.artigo || ""} onChange={e => setFormData(p => ({ ...p, artigo: e.target.value }))} placeholder="Ex: Micro Solutio" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Cor *</label>
                <Input value={formData.cor || ""} onChange={e => setFormData(p => ({ ...p, cor: e.target.value }))} placeholder="Ex: Azul Royal" />
              </div>
            </div>
            {editingId && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Status</label>
                <Select value={formData.status || "Ativo"} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={criarMutation.isPending || editarMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {editingId ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}