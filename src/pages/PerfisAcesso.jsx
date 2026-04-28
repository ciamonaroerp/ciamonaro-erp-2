import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { perfisAcessoService } from "@/components/services/administracaoService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";

const COLS = [
  { key: "nome_perfil", label: "Módulo / Perfil" },
  { key: "descricao", label: "Descrição" },
  { key: "status", label: "Status" },
];

const CAMPOS = [
  { key: "nome_perfil", label: "Módulo / Perfil", placeholder: "Ex: COMERCIAL", required: true },
  { key: "descricao", label: "Descrição", type: "textarea", placeholder: "Descrição do perfil de acesso", fullWidth: true },
  { key: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] },
];

export default function PerfisAcesso() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ["perfis-acesso", empresa_id],
    queryFn: () => perfisAcessoService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const criar = useMutation({
    mutationFn: (d) => perfisAcessoService.criar({ ...d, empresa_id }),
    onSuccess: () => { qc.invalidateQueries(["perfis-acesso"]); handleClose(); },
  });

  const editar = useMutation({
    mutationFn: ({ id, d }) => perfisAcessoService.atualizar(id, d),
    onSuccess: () => { qc.invalidateQueries(["perfis-acesso"]); handleClose(); },
  });

  const deletar = useMutation({
    mutationFn: (id) => perfisAcessoService.deletar(id),
    onSuccess: () => qc.invalidateQueries(["perfis-acesso"]),
  });

  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfis de Acesso"
        description="Gerenciamento de perfis de acesso — Supabase › perfis_acesso"
      />
      <ErpTable
        titulo="Perfis de Acesso"
        colunas={COLS}
        dados={perfis}
        isLoading={isLoading}
        campoBusca="nome_perfil"
        onNovo={() => { setFormData({ status: "Ativo" }); setEditingId(null); setModalOpen(true); }}
        onEditar={(row) => { setFormData(row); setEditingId(row.id); setModalOpen(true); }}
        onDeletar={(row) => { if (confirm("Excluir perfil?")) deletar.mutate(row.id); }}
      />
      <ErpFormModal
        open={modalOpen}
        onClose={handleClose}
        titulo="Perfil de Acesso"
        campos={CAMPOS}
        dados={formData}
        onChange={(k, v) => setFormData(p => ({ ...p, [k]: v }))}
        onSubmit={() => editingId
          ? editar.mutate({ id: editingId, d: formData })
          : criar.mutate(formData)}
        isSubmitting={criar.isPending || editar.isPending}
        isEditing={!!editingId}
      />
    </div>
  );
}