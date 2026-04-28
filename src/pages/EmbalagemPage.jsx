import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { embalagensService } from "@/components/services/embalagemService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";

const CAMPOS = [
  { key: "descricao", label: "Descrição", required: true },
  { key: "codigo", label: "Código" },
  { key: "tipo", label: "Tipo", type: "select", options: ["Caixa", "Sacola", "Etiqueta", "Fita", "Papel", "Outro"] },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "estoque_atual", label: "Estoque Atual", type: "number" },
  { key: "estoque_minimo", label: "Estoque Mínimo", type: "number" },
  { key: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] },
];

const COLS = [
  { key: "codigo", label: "Código" },
  { key: "descricao", label: "Descrição" },
  { key: "tipo", label: "Tipo" },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "estoque_atual", label: "Estoque" },
  { key: "status", label: "Status" },
];

export default function EmbalagemPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  const { data: embalagens = [], isLoading } = useQuery({
    queryKey: ["embalagens", empresa_id],
    queryFn: () => embalagensService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const criar = useMutation({ mutationFn: d => embalagensService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["embalagens"]); handleClose(); } });
  const editar = useMutation({ mutationFn: ({ id, d }) => embalagensService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["embalagens"]); handleClose(); } });
  const deletar = useMutation({ mutationFn: id => embalagensService.deletar(id), onSuccess: () => qc.invalidateQueries(["embalagens"]) });

  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  return (
    <div className="space-y-6">
      <PageHeader title="Embalagem" description="Controle de materiais de embalagem" />

      <ErpTable titulo="Embalagens" colunas={COLS} dados={embalagens} isLoading={isLoading}
        campoBusca="descricao"
        onNovo={() => { setFormData({ status: "Ativo" }); setEditingId(null); setModalOpen(true); }}
        onEditar={row => { setFormData(row); setEditingId(row.id); setModalOpen(true); }}
        onDeletar={row => { if (confirm("Excluir embalagem?")) deletar.mutate(row.id); }} />

      <ErpFormModal open={modalOpen} onClose={handleClose} titulo="Embalagem"
        campos={CAMPOS} dados={formData} onChange={(k, v) => setFormData(p => ({ ...p, [k]: v }))}
        onSubmit={() => editingId ? editar.mutate({ id: editingId, d: formData }) : criar.mutate(formData)}
        isSubmitting={criar.isPending || editar.isPending} isEditing={!!editingId} />
    </div>
  );
}