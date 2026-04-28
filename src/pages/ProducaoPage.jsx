import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { producaoEtapasService } from "@/components/services/producaoService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { format } from "date-fns";

const CAMPOS = [
  { key: "ordem_producao", label: "Nº Ordem de Produção", required: true },
  { key: "descricao_etapa", label: "Etapa / Operação", required: true },
  { key: "responsavel", label: "Responsável" },
  { key: "data_inicio", label: "Início", type: "date" },
  { key: "data_fim", label: "Fim", type: "date" },
  { key: "status", label: "Status", type: "select", options: ["Pendente", "Em andamento", "Concluída", "Bloqueada"] },
  { key: "observacoes", label: "Observações", type: "textarea", fullWidth: true },
];

const COLS = [
  { key: "ordem_producao", label: "Nº OP" },
  { key: "descricao_etapa", label: "Etapa" },
  { key: "responsavel", label: "Responsável" },
  { key: "data_inicio", label: "Início", render: v => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
  { key: "data_fim", label: "Fim", render: v => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
  { key: "status", label: "Status" },
];

export default function ProducaoPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  const { data: etapas = [], isLoading } = useQuery({
    queryKey: ["producao_etapas", empresa_id],
    queryFn: () => producaoEtapasService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const criar = useMutation({ mutationFn: d => producaoEtapasService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["producao_etapas"]); handleClose(); } });
  const editar = useMutation({ mutationFn: ({ id, d }) => producaoEtapasService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["producao_etapas"]); handleClose(); } });
  const deletar = useMutation({ mutationFn: id => producaoEtapasService.deletar(id), onSuccess: () => qc.invalidateQueries(["producao_etapas"]) });

  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  return (
    <div className="space-y-6">
      <PageHeader title="Produção" description="Acompanhamento de etapas e operações de produção" />

      <ErpTable titulo="Etapas de Produção" colunas={COLS} dados={etapas} isLoading={isLoading}
        campoBusca="descricao_etapa"
        onNovo={() => { setFormData({ status: "Pendente" }); setEditingId(null); setModalOpen(true); }}
        onEditar={row => { setFormData(row); setEditingId(row.id); setModalOpen(true); }}
        onDeletar={row => { if (confirm("Excluir etapa?")) deletar.mutate(row.id); }} />

      <ErpFormModal open={modalOpen} onClose={handleClose} titulo="Etapa de Produção"
        campos={CAMPOS} dados={formData} onChange={(k, v) => setFormData(p => ({ ...p, [k]: v }))}
        onSubmit={() => editingId ? editar.mutate({ id: editingId, d: formData }) : criar.mutate(formData)}
        isSubmitting={criar.isPending || editar.isPending} isEditing={!!editingId} />
    </div>
  );
}