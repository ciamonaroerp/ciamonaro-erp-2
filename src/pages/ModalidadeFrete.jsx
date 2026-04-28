import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { modalidadeFreteService } from "@/components/services/administracaoService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { cn } from "@/lib/utils";
import { ErpPageLayout, ErpTableContainer } from "@/components/design-system";
import SearchAndCreateHeader from "@/components/admin/SearchAndCreateHeader";

export default function ModalidadeFretePagePage() {
  const { empresa_id } = useEmpresa();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const qc = useQueryClient();
  const { showError, showDelete } = useGlobalAlert();

  const { data: modalidades = [] } = useQuery({
    queryKey: ["modalidade-frete", empresa_id],
    queryFn: () => modalidadeFreteService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const filteredModalidades = useMemo(() => {
    if (!searchTerm) return modalidades;
    const term = searchTerm.toLowerCase();
    return modalidades.filter(m => 
      m.nome_modalidade?.toLowerCase().includes(term) ||
      m.descricao?.toLowerCase().includes(term)
    );
  }, [modalidades, searchTerm]);

  const criarMutation = useMutation({
    mutationFn: (data) => modalidadeFreteService.criar({ ...data, empresa_id }),
    onSuccess: () => { qc.invalidateQueries(["modalidade-frete"]); closeModal(); }
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }) => modalidadeFreteService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries(["modalidade-frete"]); closeModal(); }
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => modalidadeFreteService.deletar(id),
    onSuccess: () => qc.invalidateQueries(["modalidade-frete"]),
  });

  const closeModal = () => {
    setModalOpen(false);
    setFormData({});
    setEditingId(null);
    setViewData(null);
  };

  const handleSubmit = async () => {
    if (!formData.nome_modalidade) {
      showError({ title: "Campo obrigatório", description: "Nome é obrigatório." });
      return;
    }
    if (editingId) {
      editarMutation.mutate({ id: editingId, data: formData });
    } else {
      criarMutation.mutate(formData);
    }
  };

  const handleEdit = (row) => {
    setFormData(row);
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleView = (row) => {
    setViewData(row);
    setModalOpen(true);
  };

  return (
    <ErpPageLayout
      title="Modalidades de Frete"
      description="Gestão centralizada de modalidades de frete"
      action={
        <Button onClick={() => { setFormData({}); setEditingId(null); setModalOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4" /> + Nova modalidade
        </Button>
      }
    >
      {/* Busca */}
      <SearchAndCreateHeader 
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Buscar por nome ou descrição..."
        hideCreateButton
      />

      {/* Tabela */}
      <ErpTableContainer>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Nome</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Descrição</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Data Cadastro</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredModalidades.map(m => (
                <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{m.nome_modalidade}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{m.descricao || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-1 rounded text-xs font-medium", 
                      m.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleView(m)} className="p-2 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(m)} className="p-2 hover:bg-amber-100 rounded transition-colors text-amber-600" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => showDelete({ title: "Excluir Modalidade", description: `Excluir "${m.nome_modalidade}"? Esta ação não pode ser desfeita.`, onConfirm: () => deletarMutation.mutateAsync(m.id) })} className="p-2 hover:bg-red-100 rounded transition-colors text-red-600" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ErpTableContainer>

      {/* Modal de Formulário */}
      <Dialog open={modalOpen && !viewData} onOpenChange={() => !viewData && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Modalidade" : "Nova Modalidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Nome da Modalidade *</label>
              <Input value={formData.nome_modalidade || ""} onChange={(e) => setFormData({...formData, nome_modalidade: e.target.value})} placeholder="Ex: Rodoviário, Aéreo, Marítimo" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Descrição</label>
              <Textarea value={formData.descricao || ""} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Descreva a modalidade de frete" className="h-32" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Status</label>
              <Select value={formData.status || "Ativo"} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={criarMutation.isPending || editarMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {editingId ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={!!viewData} onOpenChange={() => setViewData(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Modalidade</DialogTitle>
          </DialogHeader>
          {viewData && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Nome</p>
                <p className="text-sm text-slate-900">{viewData.nome_modalidade}</p>
              </div>
              {viewData.descricao && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Descrição</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{viewData.descricao}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Status</p>
                  <p className="text-sm text-slate-900">{viewData.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Data Cadastro</p>
                  <p className="text-sm text-slate-900">{viewData.created_date ? new Date(viewData.created_date).toLocaleDateString('pt-BR') : "-"}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setViewData(null)}>Fechar</Button>
            <Button onClick={() => { handleEdit(viewData); setViewData(null); }} className="bg-blue-600 hover:bg-blue-700">Editar</Button>
          </div>
        </DialogContent>
      </Dialog>


    </ErpPageLayout>
  );
}