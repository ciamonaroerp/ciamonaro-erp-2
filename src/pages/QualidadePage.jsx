import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { controleQualidadeService } from "@/components/services/qualidadeService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { format } from "date-fns";

const CAMPOS = [
  { key: "produto_lote", label: "Produto / Lote", required: true },
  { key: "ordem_producao", label: "Nº OP" },
  { key: "responsavel", label: "Responsável" },
  { key: "data_inspecao", label: "Data Inspeção", type: "date" },
  { key: "resultado", label: "Resultado", type: "select", options: ["Aprovado", "Reprovado", "Em análise"] },
  { key: "observacoes", label: "Observações / NC", type: "textarea", fullWidth: true },
];

const COLS = [
  { key: "produto_lote", label: "Produto / Lote" },
  { key: "ordem_producao", label: "OP" },
  { key: "responsavel", label: "Responsável" },
  { key: "data_inspecao", label: "Inspeção", render: v => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
  { key: "resultado", label: "Resultado" },
];

export default function QualidadePage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["controle_qualidade", empresa_id],
    queryFn: () => controleQualidadeService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const criar = useMutation({ mutationFn: d => controleQualidadeService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["controle_qualidade"]); handleClose(); } });
  const editar = useMutation({ mutationFn: ({ id, d }) => controleQualidadeService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["controle_qualidade"]); handleClose(); } });
  const deletar = useMutation({ mutationFn: id => controleQualidadeService.deletar(id), onSuccess: () => qc.invalidateQueries(["controle_qualidade"]) });

  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  return (
    <div className="space-y-6">
      <PageHeader title="Qualidade" description="Controle e inspeção de qualidade" />

      <ErpTable titulo="Controle de Qualidade" colunas={COLS} dados={registros} isLoading={isLoading}
        campoBusca="produto_lote"
        onNovo={() => { setFormData({ resultado: "Em análise" }); setEditingId(null); setModalOpen(true); }}
        onEditar={row => { setFormData(row); setEditingId(row.id); setModalOpen(true); }}
        onDeletar={row => { if (confirm("Excluir registro?")) deletar.mutate(row.id); }} />

      <ErpFormModal open={modalOpen} onClose={handleClose} titulo="Registro de Qualidade"
        campos={CAMPOS} dados={formData} onChange={(k, v) => setFormData(p => ({ ...p, [k]: v }))}
        onSubmit={() => editingId ? editar.mutate({ id: editingId, d: formData }) : criar.mutate(formData)}
        isSubmitting={criar.isPending || editar.isPending} isEditing={!!editingId} />
    </div>
  );
}