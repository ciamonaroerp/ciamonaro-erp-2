import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configuracoesService } from "@/components/services/administracaoService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpFormModal from "@/components/erp/ErpFormModal";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Save, Loader2, Trash2 } from "lucide-react";

const CAMPOS = [
  { key: "nome_config", label: "Nome da Configuração", placeholder: "Ex: timeout_sessao", required: true },
  { key: "valor_config", label: "Valor", placeholder: "Valor da configuração", required: true, fullWidth: true },
  { key: "descricao", label: "Descrição", type: "textarea", placeholder: "Descrição da configuração", fullWidth: true },
];

export default function ConfiguracoesPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingInline, setEditingInline] = useState(null);
  const [inlineValue, setInlineValue] = useState("");

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["configuracoes-erp", empresa_id],
    queryFn: () => configuracoesService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const criar = useMutation({
    mutationFn: (d) => configuracoesService.criar({ ...d, empresa_id }),
    onSuccess: () => { qc.invalidateQueries(["configuracoes-erp"]); handleClose(); },
  });

  const editar = useMutation({
    mutationFn: ({ id, d }) => configuracoesService.atualizar(id, d),
    onSuccess: () => { qc.invalidateQueries(["configuracoes-erp"]); setEditingInline(null); handleClose(); },
  });

  const deletar = useMutation({
    mutationFn: (id) => configuracoesService.deletar(id),
    onSuccess: () => qc.invalidateQueries(["configuracoes-erp"]),
  });

  const handleClose = () => { setModalOpen(false); setFormData({}); setEditingId(null); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações Gerais"
        description="Parâmetros do CIAMONARO ERP — Supabase › configuracoes_erp"
        action={
          <Button onClick={() => { setFormData({}); setEditingId(null); setModalOpen(true); }} className="gap-2 text-white" style={{ background: '#3B5CCC' }}>
            <Plus className="h-4 w-4" /> Nova Configuração
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm" style={{ color: '#9CA3AF' }}>
          Nenhuma configuração cadastrada.
        </div>
      ) : (
        <div className="grid gap-4">
          {configs.map(config => (
            <Card key={config.id} className="rounded-xl border-slate-200 hover:shadow-md transition-shadow shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <span className="text-xs font-mono px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                      {config.nome_config}
                    </span>
                    {config.descricao && <p className="text-sm text-slate-500">{config.descricao}</p>}
                    {editingInline === config.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input value={inlineValue} onChange={e => setInlineValue(e.target.value)} className="max-w-xs" autoFocus />
                        <Button size="sm" onClick={() => editar.mutate({ id: config.id, d: { valor_config: inlineValue } })} disabled={editar.isPending}>
                          {editar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingInline(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-slate-900">{config.valor_config}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Editar inline" onClick={() => { setEditingInline(config.id); setInlineValue(config.valor_config); }}
                      className="h-8 w-8 text-slate-400 hover:text-blue-600">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Editar completo" onClick={() => { setFormData(config); setEditingId(config.id); setModalOpen(true); }}
                      className="h-8 w-8 text-slate-400 hover:text-blue-600">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Excluir" onClick={() => { if (confirm("Excluir configuração?")) deletar.mutate(config.id); }}
                      className="h-8 w-8 text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ErpFormModal
        open={modalOpen}
        onClose={handleClose}
        titulo="Configuração"
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