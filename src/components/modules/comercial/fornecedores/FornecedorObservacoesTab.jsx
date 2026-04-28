import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fornecedorObservacoesService } from "@/components/services/supabaseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const empty = { observacao: "", usuario: "" };

export default function FornecedorObservacoesTab({ fornecedorId, empresaId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: obs = [] } = useQuery({
    queryKey: ["fornecedor_observacoes", fornecedorId],
    queryFn: () => fornecedorObservacoesService.list({ fornecedor_id: fornecedorId }),
    enabled: !!fornecedorId,
  });

  const salvar = useMutation({
    mutationFn: (d) =>
      d.id
        ? fornecedorObservacoesService.update(d.id, { observacao: d.observacao, usuario: d.usuario })
        : fornecedorObservacoesService.create({ observacao: d.observacao, usuario: d.usuario, fornecedor_id: fornecedorId, empresa_id: empresaId }),
    onSuccess: () => { qc.invalidateQueries(["fornecedor_observacoes", fornecedorId]); setEditing(null); },
  });

  const deletar = useMutation({
    mutationFn: (id) => fornecedorObservacoesService.delete(id),
    onSuccess: () => qc.invalidateQueries(["fornecedor_observacoes", fornecedorId]),
  });

  const f = (field) => (e) => setEditing(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{obs.length} observação(ões) cadastrada(s)</p>
        <Button size="sm" onClick={() => setEditing(empty)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Adicionar observação
        </Button>
      </div>

      {editing && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Usuário</label>
              <Input value={editing.usuario || ""} onChange={f("usuario")} placeholder="Nome do usuário" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Data</label>
              <Input type="date" value={new Date().toISOString().slice(0, 10)} disabled className="opacity-60" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 block mb-1">Observação *</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={editing.observacao || ""}
                onChange={f("observacao")}
                placeholder="Digite a observação..."
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => salvar.mutate(editing)} disabled={!editing.observacao || salvar.isPending} className="bg-blue-600 hover:bg-blue-700">
              {salvar.isPending ? "Salvando..." : editing.id ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {obs.length === 0 && !editing && (
        <div className="text-center py-8 text-slate-400">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma observação cadastrada</p>
        </div>
      )}

      <div className="space-y-2">
        {obs.map(o => (
          <div key={o.id} className="p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm text-slate-800">{o.observacao}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {o.usuario && <span className="font-medium">{o.usuario} — </span>}
                  {o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(o)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => window.confirm("Excluir esta observação?") && deletar.mutate(o.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}