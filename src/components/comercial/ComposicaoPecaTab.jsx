import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { supabase } from "@/components/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

export default function ComposicaoPecaTab() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showDelete, showError, showSuccess } = useGlobalAlert();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRendimento, setEditingRendimento] = useState(null);
  const [nomeRendimento, setNomeRendimento] = useState("");

  const { data: rendimentos = [], isLoading } = useQuery({
    queryKey: ["produto-rendimentos", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const { data } = await supabase.from("produto_rendimentos").select("*").eq("empresa_id", empresa_id).is("deleted_at", null).order("nome");
      return data || [];
    },
    enabled: !!empresa_id,
    staleTime: 30000,
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("produto_rendimentos").insert({ empresa_id, nome: nomeRendimento.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["produto-rendimentos", empresa_id]); closeModal(); showSuccess({ title: "Composição criada", description: "Composição cadastrada com sucesso." }); },
    onError: (e) => showError({ title: "Erro ao criar composição", description: e.message }),
  });

  const editarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("produto_rendimentos").update({ nome: nomeRendimento.trim() }).eq("id", editingRendimento.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["produto-rendimentos", empresa_id]); closeModal(); showSuccess({ title: "Composição atualizada", description: "Nome alterado com sucesso." }); },
    onError: (e) => showError({ title: "Erro ao atualizar composição", description: e.message }),
  });

  const deletarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("produto_rendimentos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries(["produto-rendimentos", empresa_id]); qc.invalidateQueries(["rendimentos-valores", empresa_id]); showSuccess({ title: "Composição excluída", description: "Composição removida com sucesso." }); },
    onError: (e) => showError({ title: "Erro ao excluir composição", description: e.message }),
  });

  const closeModal = () => { setModalOpen(false); setEditingRendimento(null); setNomeRendimento(""); };

  const handleSalvar = () => {
    if (!nomeRendimento.trim()) { showError({ title: "Campo obrigatório", description: "Informe o nome da composição." }); return; }
    if (editingRendimento) editarMutation.mutate();
    else criarMutation.mutate();
  };

  const handleEditar = (r) => { setEditingRendimento(r); setNomeRendimento(r.nome); setModalOpen(true); };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{rendimentos.length} composição(ões) cadastrada(s)</p>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setEditingRendimento(null); setNomeRendimento(""); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova composição
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Carregando...</span>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Nome da Composição</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rendimentos.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-10 text-center text-slate-400 text-sm">Nenhuma composição cadastrada ainda.</td></tr>
                )}
                {rendimentos.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.nome}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditar(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => showDelete({ title: `Excluir composição "${r.nome}"?`, description: "Essa ação não poderá ser desfeita.", onConfirm: () => deletarMutation.mutateAsync(r.id) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={v => { if (!v) closeModal(); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{editingRendimento ? "Editar Composição" : "Nova Composição"}</DialogTitle></DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Nome da Composição *</label>
                <Input autoFocus placeholder="Ex: Composição Padrão" value={nomeRendimento} onChange={e => setNomeRendimento(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSalvar(); }} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
              <Button onClick={handleSalvar} disabled={criarMutation.isPending || editarMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {(criarMutation.isPending || editarMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingRendimento ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}