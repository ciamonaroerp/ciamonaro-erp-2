import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fornecedoresPagamentosService } from "@/components/services/supabaseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CreditCard, Landmark } from "lucide-react";

const TIPOS_CHAVE_PIX = ["CPF/CNPJ", "E-mail", "Telefone", "Chave aleatória"];

const BANCOS_BR = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "003", nome: "Banco da Amazônia" },
  { codigo: "004", nome: "Banco do Nordeste" },
  { codigo: "033", nome: "Santander" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "070", nome: "BRB" },
  { codigo: "077", nome: "Inter" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "133", nome: "Cresol" },
  { codigo: "197", nome: "Stone" },
  { codigo: "208", nome: "BTG Pactual" },
  { codigo: "212", nome: "Banco Original" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "260", nome: "Nu Pagamentos (Nubank)" },
  { codigo: "290", nome: "PagBank" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "336", nome: "C6 Bank" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "422", nome: "Banco Safra" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "756", nome: "Sicoob" },
];

const EMPTY = {
  tipo_pagamento: "", cpf_cnpj_titular: "", banco_codigo: "", banco_nome: "",
  agencia: "", conta: "", pix_tipo: "", pix_chave: ""
};

export default function FornecedorPagamentoTab({ fornecedorId, empresaId }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bancoBusca, setBancoBusca] = useState("");

  const { data: contas = [] } = useQuery({
    queryKey: ["fornecedor_pagamentos", fornecedorId],
    queryFn: () => fornecedoresPagamentosService.list({ fornecedor_id: fornecedorId }),
    enabled: !!fornecedorId,
  });

  const salvar = useMutation({
    mutationFn: (d) =>
      d.id
        ? fornecedoresPagamentosService.update(d.id, {
            tipo_pagamento: d.tipo_pagamento,
            cpf_cnpj_titular: d.cpf_cnpj_titular,
            banco_codigo: d.banco_codigo,
            banco_nome: d.banco_nome,
            agencia: d.agencia,
            conta: d.conta,
            pix_tipo: d.pix_tipo,
            pix_chave: d.pix_chave
          })
        : fornecedoresPagamentosService.create({
            tipo_pagamento: d.tipo_pagamento,
            cpf_cnpj_titular: d.cpf_cnpj_titular,
            banco_codigo: d.banco_codigo,
            banco_nome: d.banco_nome,
            agencia: d.agencia,
            conta: d.conta,
            pix_tipo: d.pix_tipo,
            pix_chave: d.pix_chave,
            fornecedor_id: fornecedorId,
            empresa_id: empresaId
          }),
    onSuccess: () => { qc.invalidateQueries(["fornecedor_pagamentos", fornecedorId]); setModal(false); setEditing(null); },
  });

  const deletar = useMutation({
    mutationFn: (id) => fornecedoresPagamentosService.delete(id),
    onSuccess: () => qc.invalidateQueries(["fornecedor_pagamentos", fornecedorId]),
  });

  const handleSelectBanco = (codigo) => {
    const banco = BANCOS_BR.find(b => b.codigo === codigo);
    setEditing(d => ({ ...d, banco_codigo: banco?.codigo || "", banco_nome: banco?.nome || "" }));
    setBancoBusca("");
  };

  const bancosFiltrados = bancoBusca
    ? BANCOS_BR.filter(b => b.nome.toLowerCase().includes(bancoBusca.toLowerCase()) || b.codigo.includes(bancoBusca))
    : BANCOS_BR;

  const openAdd = () => { setEditing({ ...EMPTY }); setBancoBusca(""); setModal(true); };
  const openEdit = (c) => { setEditing({ ...c }); setBancoBusca(""); setModal(true); };

  const isTransferencia = editing?.tipo_pagamento === "Transferência bancária";
  const canSave = !!editing?.tipo_pagamento;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{contas.length} forma(s) de pagamento cadastrada(s)</p>
        {fornecedorId ? (
          <Button size="sm" onClick={openAdd} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Adicionar forma de pagamento
          </Button>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
            Salve o fornecedor primeiro para adicionar formas de pagamento.
          </p>
        )}
      </div>

      {contas.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma forma de pagamento cadastrada</p>
        </div>
      )}

      <div className="space-y-2">
        {contas.map(c => (
          <div key={c.id} className="p-4 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1 text-sm">
              <span className="inline-block text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded mb-1">{c.tipo_pagamento}</span>
              {c.tipo_pagamento === "Transferência bancária" && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-xs text-slate-400 block">Banco</span><span className="font-medium">{c.banco_codigo} — {c.banco_nome || "—"}</span></div>
                  <div><span className="text-xs text-slate-400 block">Titular</span><span className="font-medium">{c.cpf_cnpj_titular || "—"}</span></div>
                  <div><span className="text-xs text-slate-400 block">Agência / Conta</span><span className="font-medium">{c.agencia} / {c.conta}</span></div>
                  {c.pix_chave && <div><span className="text-xs text-slate-400 block">PIX ({c.pix_tipo})</span><span className="font-medium">{c.pix_chave}</span></div>}
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => window.confirm("Excluir esta forma de pagamento?") && deletar.mutate(c.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-blue-600" /> Forma de Pagamento</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 mt-2">
              {/* Tipo de pagamento — sempre primeiro */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Tipo de Pagamento *</label>
                <Select value={editing.tipo_pagamento} onValueChange={v => setEditing(d => ({ ...d, tipo_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobrança bancária">Cobrança bancária</SelectItem>
                    <SelectItem value="Transferência bancária">Transferência bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dados bancários — somente se Transferência */}
              {isTransferencia && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">CPF ou CNPJ do Titular</label>
                    <Input value={editing.cpf_cnpj_titular} onChange={e => setEditing(d => ({ ...d, cpf_cnpj_titular: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Buscar Banco (nome ou código)</label>
                    <Input value={bancoBusca} onChange={e => setBancoBusca(e.target.value)} placeholder="Digite para buscar..." />
                    {bancoBusca && (
                      <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                        {bancosFiltrados.slice(0, 10).map(b => (
                          <button key={b.codigo} onClick={() => handleSelectBanco(b.codigo)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-b-0">
                            <span className="font-mono text-slate-500 mr-2">{b.codigo}</span>{b.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Código do Banco</label>
                      <Input value={editing.banco_codigo} onChange={e => setEditing(d => ({ ...d, banco_codigo: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Nome do Banco</label>
                      <Input value={editing.banco_nome} onChange={e => setEditing(d => ({ ...d, banco_nome: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Agência</label>
                      <Input value={editing.agencia} onChange={e => setEditing(d => ({ ...d, agencia: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Conta</label>
                      <Input value={editing.conta} onChange={e => setEditing(d => ({ ...d, conta: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Chave PIX</label>
                      <Input value={editing.pix_chave} onChange={e => setEditing(d => ({ ...d, pix_chave: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Tipo de Chave</label>
                      <Select value={editing.pix_tipo} onValueChange={v => setEditing(d => ({ ...d, pix_tipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_CHAVE_PIX.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setModal(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => salvar.mutate(editing)} disabled={!canSave || salvar.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {salvar.isPending ? "Salvando..." : editing.id ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}