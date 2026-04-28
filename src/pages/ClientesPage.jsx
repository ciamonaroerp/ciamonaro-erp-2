import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientesService, usuariosService } from "@/components/services/supabaseService";
import { sanitizeBySchema } from "@/components/services/baseService";

const CLIENTES_COLUMNS = [
  'empresa_id', 'codigo', 'nome_cliente', 'nome_fantasia', 'documento', 'tipo_pessoa',
  'inscricao_estadual', 'situacao_ie', 'email', 'telefone', 'celular', 'site',
  'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep',
  'limite_credito', 'condicao_pagamento', 'observacoes', 'status',
  'situacao_cadastral', 'data_abertura', 'atividade_principal', 'vendedor_id', 'vendedor_nome'
];
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Building2, User2 } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import ClienteResumoCards from "@/components/clientes/ClienteResumoCards";
import ClienteContatosTab from "@/components/clientes/ClienteContatosTab";
import ClienteEnderecosTab from "@/components/clientes/ClienteEnderecosTab";
import ClienteFinanceiroTab from "@/components/clientes/ClienteFinanceiroTab";
import ClienteDetalhesTecnicosTab from "@/components/clientes/ClienteDetalhesTecnicosTab";
import { useCNPJLookup } from "@/components/hooks/useCNPJLookup";
import { useCEPLookup } from "@/components/hooks/useCEPLookup";
import { maskPhone, isValidEmail, generateCodigo, isDuplicateDocument } from "@/components/hooks/useFormValidation";

const EMPTY_FORM = {
  tipo_pessoa: "PJ",
  nome_cliente: "",
  nome_fantasia: "",
  documento: "",
  email: "",
  telefone: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  status: "Ativo",
  vendedor_id: "",
  vendedor_nome: "",
  inscricao_estadual: "",
  situacao_ie: "",
  situacao_cadastral: "",
  data_abertura: "",
  atividade_principal: "",
};

function ClienteForm({ form, setForm, vendedores, onSave, onCancel, isSaving, clientes }) {
  const { loading: cnpjLoading, error: cnpjError, lookupCNPJ, clearError } = useCNPJLookup();
  const { loading: cepLoading, error: cepError, lookupCEP, clearError: clearCepErr } = useCEPLookup();
  const cnpjFilledAddress = useRef(false);

  const isPJ = form.tipo_pessoa === "PJ";
  const isContribuinte = form.situacao_ie === "Contribuinte";

  const handleCNPJ = (val) => {
    const digits = val.replace(/\D/g, "");
    const formatted = digits
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
      .slice(0, 18);
    setForm(f => ({ ...f, documento: formatted }));
    if (digits.length === 14) {
      clearError();
      lookupCNPJ(digits, (dados) => {
        const hasAddress = !!(dados.endereco || dados.logradouro);
        cnpjFilledAddress.current = hasAddress;
        setForm(f => ({
          ...f,
          nome_cliente: dados.nome_transportadora || dados.razao_social || f.nome_cliente,
          nome_fantasia: dados.nome_fantasia || f.nome_fantasia,
          endereco: dados.endereco || dados.logradouro || f.endereco,
          numero: dados.numero || f.numero,
          bairro: dados.bairro || f.bairro,
          cidade: dados.cidade || dados.municipio || f.cidade,
          estado: dados.estado || dados.uf || f.estado,
          cep: dados.cep || f.cep,
          email: dados.email || f.email,
          telefone: dados.telefone || f.telefone,
          situacao_cadastral: dados.situacao_cadastral || f.situacao_cadastral,
          data_abertura: dados.data_abertura || f.data_abertura,
          atividade_principal: dados.atividade_principal || f.atividade_principal,
        }));
      });
    }
  };

  const handleCEP = (val) => {
    const digits = val.replace(/\D/g, "");
    const formatted = digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2").slice(0, 9);
    setForm(f => ({ ...f, cep: formatted }));
    if (digits.length === 8 && !cnpjFilledAddress.current) {
      clearCepErr();
      lookupCEP(digits, (end) => {
        setForm(f => ({
          ...f,
          endereco: end.logradouro || end.endereco || f.endereco,
          bairro: end.bairro || f.bairro,
          cidade: end.cidade || end.localidade || f.cidade,
          estado: end.estado || end.uf || f.estado,
        }));
      });
    }
  };

  const handleVendedor = (id) => {
    const v = vendedores.find(u => u.id === id);
    setForm(f => ({ ...f, vendedor_id: id, vendedor_nome: v ? v.nome : "" }));
  };

  const isDuplicate = isDuplicateDocument(form.documento, clientes || [], "documento", form.id);
  const emailOk = isValidEmail(form.email);
  const baseRequired = [form.documento, form.nome_cliente, form.email, form.telefone, form.cep, form.endereco, form.numero, form.bairro, form.cidade, form.estado];
  const canSave = baseRequired.every(v => v && v.trim && v.trim() !== "") && emailOk && !isDuplicate;

  return (
    <div className="space-y-4">
      {/* Tipo de pessoa */}
      <div className="flex gap-2">
        {["PJ", "PF"].map(t => (
          <button
            key={t}
            onClick={() => { setForm(f => ({ ...f, tipo_pessoa: t, documento: "", situacao_ie: "Não Contribuinte", inscricao_estadual: "" })); cnpjFilledAddress.current = false; }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${form.tipo_pessoa === t ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {t === "PJ" ? <Building2 className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
            {t === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
          </button>
        ))}
      </div>

      {isDuplicate && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">Este CPF/CNPJ já está cadastrado neste módulo.</div>}
  {cnpjError && <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">{cnpjError} — preencha os dados manualmente.</div>}
      {cnpjLoading && <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">Consultando CNPJ nas bases públicas...</div>}
      {cepError && <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">{cepError}</div>}
      {cepLoading && <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">Consultando CEP...</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">{isPJ ? "CNPJ" : "CPF"} *</label>
          <Input
            value={form.documento}
            onChange={e => isPJ ? handleCNPJ(e.target.value) : setForm(f => ({ ...f, documento: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Razão Social / Nome *</label>
          <Input value={form.nome_cliente} onChange={e => setForm(f => ({ ...f, nome_cliente: e.target.value }))} />
        </div>
        {isPJ && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Nome Fantasia *</label>
            <Input value={form.nome_fantasia || ""} onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))} />
          </div>
        )}
        {isPJ && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Situação Cadastral *</label>
            <Input value={form.situacao_cadastral || ""} onChange={e => setForm(f => ({ ...f, situacao_cadastral: e.target.value }))} />
          </div>
        )}
        {isPJ && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Data de Abertura *</label>
            <Input value={form.data_abertura || ""} onChange={e => setForm(f => ({ ...f, data_abertura: e.target.value }))} />
          </div>
        )}
        {isPJ && (
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700 block mb-1">Atividade Principal *</label>
            <Input value={form.atividade_principal || ""} onChange={e => setForm(f => ({ ...f, atividade_principal: e.target.value }))} />
          </div>
        )}

        {/* CEP + Número */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">CEP *</label>
          <Input value={form.cep || ""} onChange={e => handleCEP(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Número *</label>
          <Input value={form.numero || ""} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-700 block mb-1">Endereço *</label>
          <Input value={form.endereco || ""} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Bairro *</label>
          <Input value={form.bairro || ""} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Cidade *</label>
          <Input value={form.cidade || ""} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Estado *</label>
          <Input value={form.estado || ""} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} maxLength={2} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">E-mail *</label>
          <Input type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          {form.email && !isValidEmail(form.email) && <p className="text-xs text-red-500 mt-1">E-mail inválido</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Telefone *</label>
          <Input value={form.telefone || ""} onChange={e => setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))} />
        </div>

        {/* Situação ICMS + Inscrição Estadual — apenas PJ */}
        {isPJ && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Situação ICMS *</label>
            <Select value={form.situacao_ie || ""} onValueChange={v => setForm(f => ({ ...f, situacao_ie: v, inscricao_estadual: v !== "Contribuinte" ? "" : f.inscricao_estadual }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Contribuinte">Contribuinte</SelectItem>
                <SelectItem value="Contribuinte Isento">Contribuinte Isento</SelectItem>
                <SelectItem value="Não Contribuinte">Não Contribuinte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {isPJ && (
          <div>
            <label className={`text-xs font-medium block mb-1 ${isContribuinte ? "text-slate-700" : "text-slate-400"}`}>Inscrição Estadual</label>
            <Input
              value={form.inscricao_estadual || ""}
              onChange={e => setForm(f => ({ ...f, inscricao_estadual: e.target.value }))}
              disabled={!isContribuinte}
              className={!isContribuinte ? "opacity-40 cursor-not-allowed bg-slate-50" : ""}
            />
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Vendedor Responsável</label>
          <Select value={form.vendedor_id || ""} onValueChange={handleVendedor}>
            <SelectTrigger><SelectValue placeholder="Selecionar vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Sem vendedor</SelectItem>
              {vendedores.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Status *</label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
              <SelectItem value="Bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onSave} disabled={!canSave || isSaving} className="bg-blue-600 hover:bg-blue-700">
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  Ativo: "bg-green-100 text-green-700",
  Inativo: "bg-slate-100 text-slate-600",
  Bloqueado: "bg-red-100 text-red-700",
};

export default function ClientesPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showError, showDelete } = useGlobalAlert();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit'|'view', cliente?: {} }
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("dados");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes", empresa_id],
    queryFn: () => clientesService.list({ empresa_id }),
    enabled: !!empresa_id,
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores_comercial", empresa_id],
    queryFn: async () => {
      const all = await usuariosService.list({ empresa_id });
      return all.filter(u =>
        Array.isArray(u.modulos_autorizados)
          ? u.modulos_autorizados.some(m => m.toLowerCase().includes("comercial"))
          : false
      );
    },
    enabled: !!empresa_id,
  });

  const salvar = useMutation({
    mutationFn: (d) => {
      const codigo = d.id ? d.codigo : generateCodigo("CLI", clientes, "codigo");
      const data_cadastro = d.id ? d.data_cadastro : new Date().toISOString();
      const payload = sanitizeBySchema({ ...d, empresa_id, codigo, data_cadastro }, CLIENTES_COLUMNS);
      return d.id ? clientesService.update(d.id, payload) : clientesService.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(["clientes"]); setModal(null); },
    onError: (err) => showError({ title: "Erro ao salvar", description: err.message }),
  });

  const deletar = useMutation({
    mutationFn: (id) => clientesService.delete(id),
    onSuccess: () => qc.invalidateQueries(["clientes"]),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setActiveTab("dados"); setModal({ mode: "create" }); };
  const openEdit = (c) => { setForm({ ...EMPTY_FORM, ...c }); setActiveTab("dados"); setModal({ mode: "edit", cliente: c }); };
  const openView = (c) => { setForm({ ...EMPTY_FORM, ...c }); setActiveTab("dados"); setModal({ mode: "view", cliente: c }); };

  const filtered = clientes.filter(c =>
    !search ||
    c.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
    c.documento?.includes(search) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const isReadOnly = modal?.mode === "view";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, CNPJ ou cidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-16">Código</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Documento</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Cidade/UF</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nenhum cliente encontrado</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openView(c)}>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{c.codigo || "—"}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{c.nome_cliente}</p>
                  {c.nome_fantasia && <p className="text-xs text-slate-400">{c.nome_fantasia}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.documento}</td>
                <td className="px-4 py-3 text-slate-600">{c.cidade}{c.estado ? ` / ${c.estado}` : ""}</td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_COLORS[c.status] || STATUS_COLORS.Ativo}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600 mr-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => showDelete({ onConfirm: () => deletar.mutateAsync(c.id) })} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto fixed top-4 left-1/2 -translate-x-1/2 translate-y-0">
          <DialogHeader>
            <DialogTitle>
              {modal?.mode === "create" ? "Novo Cliente" : modal?.mode === "edit" ? "Editar Cliente" : "Dados do Cliente"}
            </DialogTitle>
          </DialogHeader>

          {modal?.cliente && (
            <ClienteResumoCards cliente={modal.cliente} pedidos={[]} />
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados Cadastrais</TabsTrigger>
              <TabsTrigger value="contatos" className="flex-1" disabled={!modal?.cliente?.id}>Contatos</TabsTrigger>
              <TabsTrigger value="enderecos" className="flex-1" disabled={!modal?.cliente?.id}>Endereços</TabsTrigger>
              <TabsTrigger value="financeiro" className="flex-1" disabled={!modal?.cliente?.id}>Financeiro</TabsTrigger>
              <TabsTrigger value="tecnico" className="flex-1" disabled={!modal?.cliente?.id}>Det. Técnicos</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              {isReadOnly ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Tipo", form.tipo_pessoa === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"],
                    ["Documento", form.documento],
                    ["Nome / Razão Social", form.nome_cliente],
                    ["Nome Fantasia", form.nome_fantasia],
                    ["Situação Cadastral", form.situacao_cadastral],
                    ["Data de Abertura", form.data_abertura],
                    ["Atividade Principal", form.atividade_principal],
                    ["Endereço", [form.endereco, form.numero].filter(Boolean).join(", ")],
                    ["Bairro / CEP", [form.bairro, form.cep].filter(Boolean).join(" — ")],
                    ["Cidade / Estado", [form.cidade, form.estado].filter(Boolean).join(" / ")],
                    ["E-mail", form.email],
                    ["Telefone", form.telefone],
                    ["Inscrição Estadual", form.inscricao_estadual],
                    ["Situação IE", form.situacao_ie],
                    ["Vendedor", form.vendedor_nome],
                    ["Status", form.status],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-0.5">{label}</p>
                      <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded px-3 py-2">{value || "—"}</p>
                    </div>
                  ))}
                  <div className="col-span-2 flex justify-end pt-2 border-t">
                    <Button onClick={() => setModal(m => ({ ...m, mode: "edit" }))} className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                  </div>
                </div>
              ) : (
                <ClienteForm
                  form={form}
                  setForm={setForm}
                  vendedores={vendedores}
                  clientes={clientes}
                  isSaving={salvar.isPending}
                  onSave={() => salvar.mutate(form)}
                  onCancel={() => setModal(null)}
                />
              )}
            </TabsContent>

            <TabsContent value="contatos" className="mt-4">
              <ClienteContatosTab clienteId={modal?.cliente?.id} empresaId={empresa_id} />
            </TabsContent>

            <TabsContent value="enderecos" className="mt-4">
              <ClienteEnderecosTab clienteId={modal?.cliente?.id} empresaId={empresa_id} />
            </TabsContent>

            <TabsContent value="financeiro" className="mt-4">
              <ClienteFinanceiroTab cliente={modal?.cliente} />
            </TabsContent>

            <TabsContent value="tecnico" className="mt-4">
              <ClienteDetalhesTecnicosTab clienteId={modal?.cliente?.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}