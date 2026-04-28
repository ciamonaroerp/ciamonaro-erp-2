import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contasReceberService, contasPagarService } from "@/components/services/financeiroService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const STATUS_CONTAS = ["Pendente", "Pago", "Vencido", "Cancelado"];

const CAMPOS_RECEBER = [
  { key: "descricao", label: "Descrição", required: true, fullWidth: true },
  { key: "cliente_nome", label: "Cliente" },
  { key: "valor", label: "Valor (R$)", type: "number", required: true },
  { key: "data_vencimento", label: "Vencimento", type: "date" },
  { key: "status", label: "Status", type: "select", options: STATUS_CONTAS },
];
const COLS_RECEBER = [
  { key: "descricao", label: "Descrição" },
  { key: "cliente_nome", label: "Cliente" },
  { key: "valor", label: "Valor (R$)", render: v => v ? `R$ ${Number(v).toFixed(2)}` : "—" },
  { key: "data_vencimento", label: "Vencimento", render: v => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
  { key: "status", label: "Status" },
];

const CAMPOS_PAGAR = [
  { key: "descricao", label: "Descrição", required: true, fullWidth: true },
  { key: "fornecedor_nome", label: "Fornecedor" },
  { key: "valor", label: "Valor (R$)", type: "number", required: true },
  { key: "data_vencimento", label: "Vencimento", type: "date" },
  { key: "status", label: "Status", type: "select", options: STATUS_CONTAS },
];
const COLS_PAGAR = [
  { key: "descricao", label: "Descrição" },
  { key: "fornecedor_nome", label: "Fornecedor" },
  { key: "valor", label: "Valor (R$)", render: v => v ? `R$ ${Number(v).toFixed(2)}` : "—" },
  { key: "data_vencimento", label: "Vencimento", render: v => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
  { key: "status", label: "Status" },
];

function useModuleState(defaultForm = {}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const handleEditar = row => { setFormData(row); setEditingId(row.id); setModalOpen(true); };
  const handleNovo = () => { setFormData({ status: "Pendente" }); setEditingId(null); setModalOpen(true); };
  const handleChange = (k, v) => setFormData(p => ({ ...p, [k]: v }));
  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };
  return { modalOpen, formData, editingId, handleEditar, handleNovo, handleChange, handleClose };
}

export default function FinanceiroPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();

  const rec = useModuleState();
  const { data: contas_receber = [], isLoading: lrec } = useQuery({
    queryKey: ["contas_receber", empresa_id],
    queryFn: () => contasReceberService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarRec = useMutation({ mutationFn: d => contasReceberService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["contas_receber"]); rec.handleClose(); } });
  const editarRec = useMutation({ mutationFn: ({ id, d }) => contasReceberService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["contas_receber"]); rec.handleClose(); } });
  const deletarRec = useMutation({ mutationFn: id => contasReceberService.deletar(id), onSuccess: () => qc.invalidateQueries(["contas_receber"]) });

  const pag = useModuleState();
  const { data: contas_pagar = [], isLoading: lpag } = useQuery({
    queryKey: ["contas_pagar", empresa_id],
    queryFn: () => contasPagarService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarPag = useMutation({ mutationFn: d => contasPagarService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["contas_pagar"]); pag.handleClose(); } });
  const editarPag = useMutation({ mutationFn: ({ id, d }) => contasPagarService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["contas_pagar"]); pag.handleClose(); } });
  const deletarPag = useMutation({ mutationFn: id => contasPagarService.deletar(id), onSuccess: () => qc.invalidateQueries(["contas_pagar"]) });

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Contas a Receber e Contas a Pagar" />

      <Tabs defaultValue="receber">
        <TabsList style={{ background: '#F5F7FB' }} className="border border-slate-200">
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="receber" className="mt-4">
          <ErpTable titulo="Contas a Receber" colunas={COLS_RECEBER} dados={contas_receber} isLoading={lrec}
            campoBusca="descricao" onNovo={rec.handleNovo} onEditar={rec.handleEditar}
            onDeletar={row => { if (confirm("Excluir?")) deletarRec.mutate(row.id); }} />
          <ErpFormModal open={rec.modalOpen} onClose={rec.handleClose} titulo="Conta a Receber"
            campos={CAMPOS_RECEBER} dados={rec.formData} onChange={rec.handleChange}
            onSubmit={() => rec.editingId ? editarRec.mutate({ id: rec.editingId, d: rec.formData }) : criarRec.mutate(rec.formData)}
            isSubmitting={criarRec.isPending || editarRec.isPending} isEditing={!!rec.editingId} />
        </TabsContent>

        <TabsContent value="pagar" className="mt-4">
          <ErpTable titulo="Contas a Pagar" colunas={COLS_PAGAR} dados={contas_pagar} isLoading={lpag}
            campoBusca="descricao" onNovo={pag.handleNovo} onEditar={pag.handleEditar}
            onDeletar={row => { if (confirm("Excluir?")) deletarPag.mutate(row.id); }} />
          <ErpFormModal open={pag.modalOpen} onClose={pag.handleClose} titulo="Conta a Pagar"
            campos={CAMPOS_PAGAR} dados={pag.formData} onChange={pag.handleChange}
            onSubmit={() => pag.editingId ? editarPag.mutate({ id: pag.editingId, d: pag.formData }) : criarPag.mutate(pag.formData)}
            isSubmitting={criarPag.isPending || editarPag.isPending} isEditing={!!pag.editingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}