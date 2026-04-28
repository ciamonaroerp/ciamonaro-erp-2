import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fornecedoresService, pedidosCompraService } from "@/components/services/comprasService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const CAMPOS_FORNECEDOR = [
  { key: "nome_fornecedor", label: "Nome do Fornecedor", required: true },
  { key: "cnpj", label: "CNPJ" },
  { key: "email", label: "Email", type: "email" },
  { key: "telefone", label: "Telefone" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
  { key: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] },
];
const COLS_FORNECEDORES = [
  { key: "nome_fornecedor", label: "Fornecedor" },
  { key: "cnpj", label: "CNPJ" },
  { key: "email", label: "Email" },
  { key: "cidade", label: "Cidade" },
  { key: "status", label: "Status" },
];

const CAMPOS_PC = [
  { key: "numero_pedido", label: "Nº Pedido" },
  { key: "fornecedor_nome", label: "Fornecedor", required: true },
  { key: "data_pedido", label: "Data Pedido", type: "date" },
  { key: "valor_total", label: "Valor Total (R$)", type: "number" },
  { key: "status", label: "Status", type: "select", options: ["Rascunho", "Enviado", "Confirmado", "Recebido", "Cancelado"] },
  { key: "observacoes", label: "Observações", type: "textarea", fullWidth: true },
];
const COLS_PC = [
  { key: "numero_pedido", label: "Nº Pedido" },
  { key: "fornecedor_nome", label: "Fornecedor" },
  { key: "data_pedido", label: "Data", render: v => v ? format(new Date(v), "dd/MM/yyyy") : "—" },
  { key: "valor_total", label: "Valor (R$)", render: v => v ? `R$ ${Number(v).toFixed(2)}` : "—" },
  { key: "status", label: "Status" },
];

function useMS(def = {}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(def);
  const [editingId, setEditingId] = useState(null);
  const handleEditar = row => { setFormData(row); setEditingId(row.id); setModalOpen(true); };
  const handleNovo = () => { setFormData({ status: "Ativo" }); setEditingId(null); setModalOpen(true); };
  const handleChange = (k, v) => setFormData(p => ({ ...p, [k]: v }));
  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };
  return { modalOpen, formData, editingId, handleEditar, handleNovo, handleChange, handleClose };
}

export default function ComprasPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();

  const forn = useMS();
  const { data: fornecedores = [], isLoading: lforn } = useQuery({
    queryKey: ["fornecedores", empresa_id],
    queryFn: () => fornecedoresService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarF = useMutation({ mutationFn: d => fornecedoresService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["fornecedores"]); forn.handleClose(); } });
  const editarF = useMutation({ mutationFn: ({ id, d }) => fornecedoresService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["fornecedores"]); forn.handleClose(); } });
  const deletarF = useMutation({ mutationFn: id => fornecedoresService.deletar(id), onSuccess: () => qc.invalidateQueries(["fornecedores"]) });

  const pc = useMS();
  const { data: pedidosCompra = [], isLoading: lpc } = useQuery({
    queryKey: ["pedidos_compra", empresa_id],
    queryFn: () => pedidosCompraService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarPC = useMutation({ mutationFn: d => pedidosCompraService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["pedidos_compra"]); pc.handleClose(); } });
  const editarPC = useMutation({ mutationFn: ({ id, d }) => pedidosCompraService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["pedidos_compra"]); pc.handleClose(); } });
  const deletarPC = useMutation({ mutationFn: id => pedidosCompraService.deletar(id), onSuccess: () => qc.invalidateQueries(["pedidos_compra"]) });

  return (
    <div className="space-y-6">
      <PageHeader title="Compras" description="Fornecedores e pedidos de compra" />

      <Tabs defaultValue="fornecedores">
        <TabsList style={{ background: '#F5F7FB' }} className="border border-slate-200">
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos de Compra</TabsTrigger>
        </TabsList>

        <TabsContent value="fornecedores" className="mt-4">
          <ErpTable titulo="Fornecedores" colunas={COLS_FORNECEDORES} dados={fornecedores} isLoading={lforn}
            campoBusca="nome_fornecedor" onNovo={forn.handleNovo} onEditar={forn.handleEditar}
            onDeletar={row => { if (confirm("Excluir fornecedor?")) deletarF.mutate(row.id); }} />
          <ErpFormModal open={forn.modalOpen} onClose={forn.handleClose} titulo="Fornecedor"
            campos={CAMPOS_FORNECEDOR} dados={forn.formData} onChange={forn.handleChange}
            onSubmit={() => forn.editingId ? editarF.mutate({ id: forn.editingId, d: forn.formData }) : criarF.mutate(forn.formData)}
            isSubmitting={criarF.isPending || editarF.isPending} isEditing={!!forn.editingId} />
        </TabsContent>

        <TabsContent value="pedidos" className="mt-4">
          <ErpTable titulo="Pedidos de Compra" colunas={COLS_PC} dados={pedidosCompra} isLoading={lpc}
            campoBusca="fornecedor_nome" onNovo={pc.handleNovo} onEditar={pc.handleEditar}
            onDeletar={row => { if (confirm("Excluir pedido de compra?")) deletarPC.mutate(row.id); }} />
          <ErpFormModal open={pc.modalOpen} onClose={pc.handleClose} titulo="Pedido de Compra"
            campos={CAMPOS_PC} dados={pc.formData} onChange={pc.handleChange}
            onSubmit={() => pc.editingId ? editarPC.mutate({ id: pc.editingId, d: pc.formData }) : criarPC.mutate(pc.formData)}
            isSubmitting={criarPC.isPending || editarPC.isPending} isEditing={!!pc.editingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}