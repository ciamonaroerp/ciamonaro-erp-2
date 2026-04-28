import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fornecedorContatosService } from "@/components/services/supabaseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { isValidEmail } from "@/components/hooks/useFormValidation";

function maskTelefoneFixo(v) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
}
function maskCelular(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

const empty = { nome: "", cargo: "", telefone: "", celular: "", whatsapp: "", email: "", observacao: "" };

export default function FornecedorContatosTab({ fornecedorId, empresaId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: contatos = [] } = useQuery({
    queryKey: ["fornecedor_contatos", fornecedorId],
    queryFn: () => fornecedorContatosService.list({ fornecedor_id: fornecedorId }),
    enabled: !!fornecedorId,
  });

  const emailValido = !editing?.email || isValidEmail(editing.email);
  const telefoneValido = !editing?.telefone || /^\(\d{2}\) \d{4}-\d{4}$/.test(editing.telefone);
  const celularValido = !editing?.celular || /^\(\d{2}\) \d{5}-\d{4}$/.test(editing.celular);
  const whatsappValido = !editing?.whatsapp || /^\(\d{2}\) \d{5}-\d{4}$/.test(editing.whatsapp);
  const podeSalvar = !!editing?.nome && emailValido && telefoneValido && celularValido && whatsappValido;

  const salvar = useMutation({
    mutationFn: (d) =>
      d.id
        ? fornecedorContatosService.update(d.id, { nome: d.nome, cargo: d.cargo, telefone: d.telefone, celular: d.celular, whatsapp: d.whatsapp, email: d.email, observacao: d.observacao })
        : fornecedorContatosService.create({ ...d, fornecedor_id: fornecedorId, empresa_id: empresaId }),
    onSuccess: () => { qc.invalidateQueries(["fornecedor_contatos", fornecedorId]); setEditing(null); },
  });

  const deletar = useMutation({
    mutationFn: (id) => fornecedorContatosService.delete(id),
    onSuccess: () => qc.invalidateQueries(["fornecedor_contatos", fornecedorId]),
  });

  const f = (field) => (e) => setEditing(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{contatos.length} contato(s) cadastrado(s)</p>
        <Button size="sm" onClick={() => setEditing(empty)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Adicionar contato
        </Button>
      </div>

      {editing && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Nome *</label>
              <Input value={editing.nome} onChange={f("nome")} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Cargo</label>
              <Input value={editing.cargo || ""} onChange={f("cargo")} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">E-mail</label>
              <Input value={editing.email || ""} onChange={e => setEditing(p => ({ ...p, email: e.target.value }))} />
              {editing.email && !emailValido && <p className="text-xs text-red-500 mt-1">E-mail inválido</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Telefone Fixo</label>
              <Input
                value={editing.telefone || ""}
                onChange={e => setEditing(p => ({ ...p, telefone: maskTelefoneFixo(e.target.value) }))}
              />
              {editing.telefone && !telefoneValido && <p className="text-xs text-red-500 mt-1">Formato inválido: (00) 0000-0000</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Celular</label>
              <Input
                value={editing.celular || ""}
                onChange={e => setEditing(p => ({ ...p, celular: maskCelular(e.target.value) }))}
              />
              {editing.celular && !celularValido && <p className="text-xs text-red-500 mt-1">Formato inválido: (00) 00000-0000</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">WhatsApp</label>
              <Input
                value={editing.whatsapp || ""}
                onChange={e => setEditing(p => ({ ...p, whatsapp: maskCelular(e.target.value) }))}
              />
              {editing.whatsapp && !whatsappValido && <p className="text-xs text-red-500 mt-1">Formato inválido: (00) 00000-0000</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Observação</label>
              <Input value={editing.observacao || ""} onChange={f("observacao")} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => salvar.mutate(editing)} disabled={!podeSalvar || salvar.isPending} className="bg-blue-600 hover:bg-blue-700">
              {salvar.isPending ? "Salvando..." : editing.id ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {contatos.length === 0 && !editing && (
        <div className="text-center py-8 text-slate-400">
          <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum contato cadastrado</p>
        </div>
      )}

      <div className="space-y-2">
        {contatos.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
              <span className="font-medium text-slate-900">{c.nome}</span>
              <span className="text-slate-500">{c.cargo || "-"}</span>
              <span className="text-slate-500">{c.telefone || "-"}</span>
              <span className="text-slate-500">{c.email || "-"}</span>
              <span className="text-slate-500 text-xs">{c.observacao || "-"}</span>
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              <button onClick={() => setEditing(c)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => window.confirm("Excluir este contato?") && deletar.mutate(c.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}