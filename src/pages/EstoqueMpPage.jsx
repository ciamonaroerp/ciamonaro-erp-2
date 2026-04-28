import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materiasPrimasService, estoqueMpMovService } from "@/components/services/estoqueMpService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const CAMPOS_MP = [
  { key: "descricao", label: "Descrição", required: true },
  { key: "codigo", label: "Código" },
  { key: "unidade", label: "Unidade (kg, m, un...)" },
  { key: "estoque_atual", label: "Estoque Atual", type: "number" },
  { key: "estoque_minimo", label: "Estoque Mínimo", type: "number" },
  { key: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] },
];
const COLS_MP = [
  { key: "codigo", label: "Código" },
  { key: "descricao", label: "Descrição" },
  { key: "unidade", label: "Unidade" },
  { key: "estoque_atual", label: "Estoque Atual" },
  { key: "estoque_minimo", label: "Mínimo" },
  { key: "status", label: "Status" },
];

const CAMPOS_MOV = [
  { key: "materia_prima", label: "Matéria Prima", required: true },
  { key: "tipo_mov", label: "Tipo", type: "select", options: ["Entrada", "Saída", "Ajuste"] },
  { key: "quantidade", label: "Quantidade", type: "number", required: true },
  { key: "data_mov", label: "Data", type: "date" },
  { key: "motivo", label: "Motivo / Observação", type: "textarea", fullWidth: true },
];
const COLS_MOV = [
  { key: "materia_prima", label: "Matéria Prima" },
  { key: "tipo_mov", label: "Tipo" },
  { key: "quantidade", label: "Qtd" },
  { key: "data_mov", label: "Data", render: v => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
  { key: "motivo", label: "Motivo" },
];

function useMS() {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const handleEditar = row => { setFormData(row); setEditingId(row.id); setModalOpen(true); };
  const handleNovo = () => { setFormData({ status: "Ativo" }); setEditingId(null); setModalOpen(true); };
  const handleChange = (k, v) => setFormData(p => ({ ...p, [k]: v }));
  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };
  return { modalOpen, formData, editingId, handleEditar, handleNovo, handleChange, handleClose };
}

export default function EstoqueMpPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();

  const mp = useMS();
  const { data: mps = [], isLoading: lmp } = useQuery({
    queryKey: ["materias_primas", empresa_id],
    queryFn: () => materiasPrimasService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarMp = useMutation({ mutationFn: d => materiasPrimasService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["materias_primas"]); mp.handleClose(); } });
  const editarMp = useMutation({ mutationFn: ({ id, d }) => materiasPrimasService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["materias_primas"]); mp.handleClose(); } });
  const deletarMp = useMutation({ mutationFn: id => materiasPrimasService.deletar(id), onSuccess: () => qc.invalidateQueries(["materias_primas"]) });

  const mov = useMS();
  const { data: movs = [], isLoading: lmov } = useQuery({
    queryKey: ["estoque_materia_mov", empresa_id],
    queryFn: () => estoqueMpMovService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarMov = useMutation({ mutationFn: d => estoqueMpMovService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["estoque_materia_mov"]); mov.handleClose(); } });
  const editarMov = useMutation({ mutationFn: ({ id, d }) => estoqueMpMovService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["estoque_materia_mov"]); mov.handleClose(); } });
  const deletarMov = useMutation({ mutationFn: id => estoqueMpMovService.deletar(id), onSuccess: () => qc.invalidateQueries(["estoque_materia_mov"]) });

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque — Matéria Prima" description="Controle de matérias-primas e movimentações" />

      <Tabs defaultValue="materias">
        <TabsList style={{ background: '#F5F7FB' }} className="border border-slate-200">
          <TabsTrigger value="materias">Matérias Primas</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="materias" className="mt-4">
          <ErpTable titulo="Matérias Primas" colunas={COLS_MP} dados={mps} isLoading={lmp}
            campoBusca="descricao" onNovo={mp.handleNovo} onEditar={mp.handleEditar}
            onDeletar={row => { if (confirm("Excluir?")) deletarMp.mutate(row.id); }} />
          <ErpFormModal open={mp.modalOpen} onClose={mp.handleClose} titulo="Matéria Prima"
            campos={CAMPOS_MP} dados={mp.formData} onChange={mp.handleChange}
            onSubmit={() => mp.editingId ? editarMp.mutate({ id: mp.editingId, d: mp.formData }) : criarMp.mutate(mp.formData)}
            isSubmitting={criarMp.isPending || editarMp.isPending} isEditing={!!mp.editingId} />
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-4">
          <ErpTable titulo="Movimentações" colunas={COLS_MOV} dados={movs} isLoading={lmov}
            campoBusca="materia_prima" onNovo={mov.handleNovo} onEditar={mov.handleEditar}
            onDeletar={row => { if (confirm("Excluir movimentação?")) deletarMov.mutate(row.id); }} />
          <ErpFormModal open={mov.modalOpen} onClose={mov.handleClose} titulo="Movimentação"
            campos={CAMPOS_MOV} dados={mov.formData} onChange={mov.handleChange}
            onSubmit={() => mov.editingId ? editarMov.mutate({ id: mov.editingId, d: mov.formData }) : criarMov.mutate(mov.formData)}
            isSubmitting={criarMov.isPending || editarMov.isPending} isEditing={!!mov.editingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}