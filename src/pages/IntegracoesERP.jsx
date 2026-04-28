import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { integracoesErpService } from "@/components/services/administracaoService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Check, X, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

const CAMPOS = [
  { key: "nome_app", label: "Nome do App", required: true },
  { key: "descricao", label: "Descrição", fullWidth: true },
  { key: "webhook_url", label: "Webhook URL", placeholder: "https://...", fullWidth: true },
  { key: "secret_token", label: "Token Secreto" },
  { key: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] },
];

export default function IntegracoesERP() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showSecret, setShowSecret] = useState({});

  const { data: integracoes = [], isLoading } = useQuery({
    queryKey: ["integracoes-erp", empresa_id],
    queryFn: () => integracoesErpService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const criar = useMutation({
    mutationFn: (d) => integracoesErpService.criar({ ...d, empresa_id }),
    onSuccess: () => { qc.invalidateQueries(["integracoes-erp"]); handleClose(); },
  });

  const editar = useMutation({
    mutationFn: ({ id, d }) => integracoesErpService.atualizar(id, d),
    onSuccess: () => { qc.invalidateQueries(["integracoes-erp"]); handleClose(); },
  });

  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  const handleToggleStatus = (item) =>
    editar.mutate({ id: item.id, d: { status: item.status === "Ativo" ? "Inativo" : "Ativo" } });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-lg animate-pulse" style={{ background: '#3B5CCC' }} />
        <p className="text-sm" style={{ color: '#6B7280' }}>Carregando…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações ERP"
        description="Comunicação com aplicativos externos — Supabase › integracoes_erp"
        action={
          <Button onClick={() => { setFormData({ status: "Ativo" }); setEditingId(null); setModalOpen(true); }} className="gap-2 text-white" style={{ background: '#3B5CCC' }}>
            <Plus className="h-4 w-4" /> Nova Integração
          </Button>
        }
      />

      <div className="grid gap-4">
        {integracoes.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm" style={{ color: '#9CA3AF' }}>
            Nenhuma integração cadastrada.
          </div>
        )}
        {integracoes.map(item => (
          <div key={item.id} className="border border-slate-200 rounded-xl p-6 bg-white hover:shadow-md transition-shadow shadow-sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>{item.nome_app}</h3>
                  <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{item.descricao}</p>
                </div>
                <Badge className={item.status === "Ativo"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"}>
                  {item.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Webhook URL</p>
                  <p className="text-sm font-mono text-slate-700 break-all">{item.webhook_url || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Token Secreto</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-slate-400">
                      {showSecret[item.id] ? item.secret_token : "••••••••••••••••"}
                    </p>
                    <button onClick={() => setShowSecret(s => ({ ...s, [item.id]: !s[item.id] }))} className="text-slate-400 hover:text-slate-600">
                      {showSecret[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {item.ultima_sincronizacao && (
                <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">
                  Última sincronização: {format(new Date(item.ultima_sincronizacao), "dd/MM/yyyy HH:mm:ss")}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => handleToggleStatus(item)}>
                  {item.status === "Ativo" ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setFormData(item); setEditingId(item.id); setModalOpen(true); }} className="gap-1">
                  <Edit2 className="h-3.5 w-3.5" /> Editar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ErpFormModal
        open={modalOpen}
        onClose={handleClose}
        titulo="Integração"
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