import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clienteEnderecosService } from "@/components/services/supabaseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";

const empty = { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };

export default function ClienteEnderecosTab({ clienteId, empresaId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [cepLoading, setCepLoading] = useState(false);

  const { data: enderecos = [] } = useQuery({
    queryKey: ["cliente_enderecos", clienteId],
    queryFn: () => clienteEnderecosService.list({ cliente_id: clienteId }),
    enabled: !!clienteId,
  });

  const salvar = useMutation({
    mutationFn: (d) =>
      d.id
        ? clienteEnderecosService.update(d.id, { cep: d.cep, rua: d.rua, numero: d.numero, complemento: d.complemento, bairro: d.bairro, cidade: d.cidade, estado: d.estado })
        : clienteEnderecosService.create({ cep: d.cep, rua: d.rua, numero: d.numero, complemento: d.complemento, bairro: d.bairro, cidade: d.cidade, estado: d.estado, cliente_id: clienteId, empresa_id: empresaId }),
    onSuccess: () => { qc.invalidateQueries(["cliente_enderecos", clienteId]); setEditing(null); },
  });

  const deletar = useMutation({
    mutationFn: (id) => clienteEnderecosService.delete(id),
    onSuccess: () => qc.invalidateQueries(["cliente_enderecos", clienteId]),
  });

  const lookupCEP = async (cep) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEditing(prev => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch (_) {}
    setCepLoading(false);
  };

  const handleCEPChange = (value) => {
    const formatted = value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 9);
    setEditing(prev => ({ ...prev, cep: formatted }));
    if (formatted.replace(/\D/g, "").length === 8) lookupCEP(formatted);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{enderecos.length} endereço(s) cadastrado(s)</p>
        <Button size="sm" onClick={() => setEditing(empty)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Adicionar endereço
        </Button>
      </div>

      {editing && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="relative">
              <label className="text-xs font-medium text-slate-700 block mb-1">CEP *</label>
              <div className="relative">
                <Input value={editing.cep} onChange={e => handleCEPChange(e.target.value)} />
                {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-blue-500" />}
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 block mb-1">Rua</label>
              <Input value={editing.rua || ""} onChange={e => setEditing({ ...editing, rua: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Número</label>
              <Input value={editing.numero || ""} onChange={e => setEditing({ ...editing, numero: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 block mb-1">Complemento</label>
              <Input value={editing.complemento || ""} onChange={e => setEditing({ ...editing, complemento: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Bairro</label>
              <Input value={editing.bairro || ""} onChange={e => setEditing({ ...editing, bairro: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Cidade</label>
              <Input value={editing.cidade || ""} onChange={e => setEditing({ ...editing, cidade: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Estado</label>
              <Input value={editing.estado || ""} onChange={e => setEditing({ ...editing, estado: e.target.value })} maxLength={2} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => salvar.mutate(editing)} disabled={!editing.rua || !editing.numero || !editing.cidade || !editing.estado || salvar.isPending} className="bg-blue-600 hover:bg-blue-700">
              {salvar.isPending ? "Salvando..." : (editing.id ? "Atualizar" : "Adicionar")}
            </Button>
          </div>
        </div>
      )}

      {enderecos.length === 0 && !editing && (
        <div className="text-center py-8 text-slate-400">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum endereço de entrega cadastrado</p>
        </div>
      )}

      <div className="space-y-2">
        {enderecos.map(e => (
          <div key={e.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">
                {e.rua}{e.numero ? `, ${e.numero}` : ""}{e.complemento ? ` — ${e.complemento}` : ""}
              </p>
              <p className="text-xs text-slate-500">
                {e.bairro ? `${e.bairro}, ` : ""}{e.cidade} — {e.estado} · CEP {e.cep}
              </p>
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              <button onClick={() => setEditing(e)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => deletar.mutate(e.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}