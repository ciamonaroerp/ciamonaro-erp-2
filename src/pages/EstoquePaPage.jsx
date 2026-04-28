import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { produtosPaService, estoqueProdutosService } from "@/components/services/estoquePaService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CAMPOS_PA = [
  { key: "descricao", label: "Descrição", required: true },
  { key: "codigo", label: "Código SKU" },
  { key: "categoria", label: "Categoria" },
  { key: "unidade", label: "Unidade" },
  { key: "preco_venda", label: "Preço de Venda (R$)", type: "number" },
  { key: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] },
];
const COLS_PA = [
  { key: "codigo", label: "SKU" },
  { key: "descricao", label: "Descrição" },
  { key: "categoria", label: "Categoria" },
  { key: "preco_venda", label: "Preço (R$)", render: v => v ? `R$ ${Number(v).toFixed(2)}` : "—" },
  { key: "status", label: "Status" },
];

const CAMPOS_EST = [
  { key: "produto_descricao", label: "Produto", required: true },
  { key: "tipo_mov", label: "Tipo", type: "select", options: ["Entrada", "Saída", "Ajuste"] },
  { key: "quantidade", label: "Quantidade", type: "number", required: true },
  { key: "lote", label: "Lote / Referência" },
  { key: "observacao", label: "Observação", type: "textarea", fullWidth: true },
];
const COLS_EST = [
  { key: "produto_descricao", label: "Produto" },
  { key: "tipo_mov", label: "Tipo" },
  { key: "quantidade", label: "Quantidade" },
  { key: "lote", label: "Lote" },
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

export default function EstoquePaPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();

  const pa = useMS();
  const { data: produtos = [], isLoading: lpa } = useQuery({
    queryKey: ["produtos_pa", empresa_id],
    queryFn: () => produtosPaService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarPa = useMutation({ mutationFn: d => produtosPaService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["produtos_pa"]); pa.handleClose(); } });
  const editarPa = useMutation({ mutationFn: ({ id, d }) => produtosPaService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["produtos_pa"]); pa.handleClose(); } });
  const deletarPa = useMutation({ mutationFn: id => produtosPaService.deletar(id), onSuccess: () => qc.invalidateQueries(["produtos_pa"]) });

  const est = useMS();
  const { data: estoque = [], isLoading: lest } = useQuery({
    queryKey: ["estoque_produtos", empresa_id],
    queryFn: () => estoqueProdutosService.listar(empresa_id),
    enabled: !!empresa_id,
  });
  const criarEst = useMutation({ mutationFn: d => estoqueProdutosService.criar({ ...d, empresa_id }), onSuccess: () => { qc.invalidateQueries(["estoque_produtos"]); est.handleClose(); } });
  const editarEst = useMutation({ mutationFn: ({ id, d }) => estoqueProdutosService.atualizar(id, d), onSuccess: () => { qc.invalidateQueries(["estoque_produtos"]); est.handleClose(); } });
  const deletarEst = useMutation({ mutationFn: id => estoqueProdutosService.deletar(id), onSuccess: () => qc.invalidateQueries(["estoque_produtos"]) });

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque — Produto Acabado" description="Produtos acabados e movimentações de estoque" />

      <Tabs defaultValue="produtos">
        <TabsList style={{ background: '#F5F7FB' }} className="border border-slate-200">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="estoque">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-4">
          <ErpTable titulo="Produtos Acabados" colunas={COLS_PA} dados={produtos} isLoading={lpa}
            campoBusca="descricao" onNovo={pa.handleNovo} onEditar={pa.handleEditar}
            onDeletar={row => { if (confirm("Excluir produto?")) deletarPa.mutate(row.id); }} />
          <ErpFormModal open={pa.modalOpen} onClose={pa.handleClose} titulo="Produto Acabado"
            campos={CAMPOS_PA} dados={pa.formData} onChange={pa.handleChange}
            onSubmit={() => pa.editingId ? editarPa.mutate({ id: pa.editingId, d: pa.formData }) : criarPa.mutate(pa.formData)}
            isSubmitting={criarPa.isPending || editarPa.isPending} isEditing={!!pa.editingId} />
        </TabsContent>

        <TabsContent value="estoque" className="mt-4">
          <ErpTable titulo="Movimentações de Estoque PA" colunas={COLS_EST} dados={estoque} isLoading={lest}
            campoBusca="produto_descricao" onNovo={est.handleNovo} onEditar={est.handleEditar}
            onDeletar={row => { if (confirm("Excluir movimentação?")) deletarEst.mutate(row.id); }} />
          <ErpFormModal open={est.modalOpen} onClose={est.handleClose} titulo="Movimentação PA"
            campos={CAMPOS_EST} dados={est.formData} onChange={est.handleChange}
            onSubmit={() => est.editingId ? editarEst.mutate({ id: est.editingId, d: est.formData }) : criarEst.mutate(est.formData)}
            isSubmitting={criarEst.isPending || editarEst.isPending} isEditing={!!est.editingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}