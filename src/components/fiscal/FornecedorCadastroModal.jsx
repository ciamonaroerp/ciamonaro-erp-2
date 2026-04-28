import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2 } from "lucide-react";
import { supabase } from "@/components/lib/supabaseClient";

export default function FornecedorCadastroModal({ open, onClose, onSaved, empresa_id, dadosXml = {} }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_fornecedor: dadosXml.emitente_nome || "",
    cnpj: dadosXml.emitente_cnpj || "",
    email: "",
    telefone: "",
    tipo_item: "",
  });

  // Atualiza se dadosXml mudar ao abrir
  React.useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        nome_fornecedor: dadosXml.emitente_nome || f.nome_fornecedor,
        cnpj: dadosXml.emitente_cnpj || f.cnpj,
      }));
    }
  }, [open, dadosXml.emitente_nome, dadosXml.emitente_cnpj]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.nome_fornecedor.trim()) return alert("Razão social é obrigatória.");
    if (!form.cnpj.trim()) return alert("CNPJ é obrigatório.");
    if (!form.tipo_item) return alert("Tipo de item é obrigatório.");

    setSaving(true);
    try {
      const { data: fornecedorSalvo, error } = await supabase.from("fornecedores").insert({ empresa_id, nome_fornecedor: form.nome_fornecedor.trim(), cnpj: form.cnpj.replace(/\D/g, ""), email: form.email.trim() || null, telefone: form.telefone.trim() || null, tipo_item: form.tipo_item, status: "ativo" }).select().single();
      if (error) throw new Error(error.message);
      onSaved(fornecedorSalvo);
    } catch (err) {
      alert("Erro ao cadastrar fornecedor: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Cadastrar Fornecedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500">
            O emitente deste XML não está cadastrado como fornecedor. Preencha os dados para continuar a importação.
          </p>

          <div>
            <label className="text-sm font-medium text-slate-700">Razão Social *</label>
            <Input
              className="mt-1"
              value={form.nome_fornecedor}
              onChange={e => set("nome_fornecedor", e.target.value)}
              placeholder="Razão social do fornecedor"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">CNPJ *</label>
            <Input
              className="mt-1 font-mono"
              value={form.cnpj}
              onChange={e => set("cnpj", e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">E-mail</label>
            <Input
              className="mt-1"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="email@fornecedor.com.br"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Telefone</label>
            <Input
              className="mt-1"
              value={form.telefone}
              onChange={e => set("telefone", e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tipo de Item *</label>
            <p className="text-xs text-slate-400 mb-1">Classifica os itens deste fornecedor</p>
            <Select value={form.tipo_item} onValueChange={v => set("tipo_item", v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TECIDO">TECIDO</SelectItem>
                <SelectItem value="INSUMO">INSUMO</SelectItem>
                <SelectItem value="OUTROS">OUTROS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Salvando...</> : "Cadastrar e Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}