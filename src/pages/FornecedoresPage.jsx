import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { fornecedoresService } from "@/components/services/supabaseService";
import { sanitizeBySchema } from "@/components/services/baseService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Building2, User2, ChevronDown } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { useCNPJLookup } from "@/components/hooks/useCNPJLookup";
import { useCEPLookup } from "@/components/hooks/useCEPLookup";
import { maskPhone, isValidEmail, generateCodigo, isDuplicateDocument } from "@/components/hooks/useFormValidation";
import FornecedorContatosTab from "@/components/modules/comercial/fornecedores/FornecedorContatosTab";
import FornecedorPagamentoTab from "@/components/modules/comercial/fornecedores/FornecedorPagamentoTab";
import FornecedorObservacoesTab from "@/components/modules/comercial/fornecedores/FornecedorObservacoesTab";

// Colunas reais da tabela fornecedores no Supabase
const FORNECEDORES_COLUMNS = [
  'empresa_id', 'tipo_pessoa', 'nome_fornecedor', 'nome_fantasia', 'documento',
  'inscricao_estadual', 'email', 'telefone', 'celular',
  'endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep',
  'condicao_pagamento', 'observacoes', 'status', 'tipo_id'
];



// ─── Creatable Select para Tipo Fornecedor ──────────────────────────────────
function TipoFornecedorSelect({ value, onChange, tipos, onCreateTipo, creating }) {
  const [showCreate, setShowCreate] = useState(false);
  const [novoTipo, setNovoTipo] = useState("");

  const handleCreate = async () => {
    if (!novoTipo.trim()) return;
    const result = await onCreateTipo(novoTipo.trim());
    if (result?.id) {
      onChange(result.id);
      setNovoTipo("");
      setShowCreate(false);
    }
  };

  return (
    <div className="space-y-2">
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
        <SelectContent>
          {tipos.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Criar novo tipo
        </button>
      ) : (
        <div className="flex gap-2">
          <Input
            value={novoTipo}
            onChange={e => setNovoTipo(e.target.value)}
            placeholder="Nome do novo tipo..."
            className="h-8 text-xs"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} disabled={creating || !novoTipo.trim()} className="h-8 px-3 bg-blue-600 hover:bg-blue-700">
            {creating ? "..." : "Criar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNovoTipo(""); }} className="h-8">×</Button>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  tipo_pessoa: "PJ",
  documento: "",
  nome_fornecedor: "",
  nome_fantasia: "",
  inscricao_estadual: "",
  email: "",
  telefone: "",
  celular: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  situacao_icms: "Não Contribuinte",
  condicao_pagamento: "",
  observacoes: "",
  status: "ativo",
};

const STATUS_COLORS = {
  Ativo: "bg-green-100 text-green-700",
  Inativo: "bg-slate-100 text-slate-600",
  ativo: "bg-green-100 text-green-700",
  inativo: "bg-slate-100 text-slate-600",
  bloqueado: "bg-red-100 text-red-700",
};

// Normaliza status do banco (lowercase) para display
function normalizeStatus(s) {
  if (!s) return "Ativo";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Formulário ─────────────────────────────────────────────────────────────
function FornecedorDadosForm({ form, setForm, onSave, onCancel, isSaving, fornecedores, tipos, onCreateTipo, creatingTipo }) {
  const { loading: cnpjLoading, error: cnpjError, lookupCNPJ, clearError } = useCNPJLookup();
  const { loading: cepLoading, error: cepError, lookupCEP, clearError: clearCepErr } = useCEPLookup();
  const cnpjFilledAddress = useRef(false);

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
          nome_fornecedor: dados.nome_transportadora || dados.razao_social || f.nome_fornecedor,
          nome_fantasia: dados.nome_fantasia || f.nome_fantasia,
          endereco: dados.endereco || dados.logradouro || f.endereco,
          numero: dados.numero || f.numero,
          bairro: dados.bairro || f.bairro,
          cidade: dados.cidade || dados.municipio || f.cidade,
          estado: dados.estado || dados.uf || f.estado,
          cep: dados.cep || f.cep,
          email: dados.email || f.email,
          telefone: dados.telefone || f.telefone,
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
          cidade: end.cidade || f.cidade,
          estado: end.estado || f.estado,
        }));
      });
    }
  };

  const isPJ = form.tipo_pessoa === "PJ";
  const isContribuinte = form.situacao_icms === "Contribuinte";

  const isDuplicate = isDuplicateDocument(form.documento, fornecedores || [], "documento", form.id);
  const emailOk = isValidEmail(form.email);
  const requiredFields = [
    form.documento, form.nome_fornecedor,
    ...(isPJ ? [form.situacao_icms] : []),
    form.telefone, form.email, form.cep, form.numero,
    form.endereco, form.bairro, form.cidade, form.estado
  ];
  const canSave = requiredFields.every(v => v && v.trim && v.trim() !== "") && emailOk && !isDuplicate && !!form.tipo_id;

  return (
    <div className="space-y-4">
      {/* Tipo pessoa */}
      <div className="flex gap-2">
        {["PJ", "PF"].map(t => (
          <button key={t}
            onClick={() => { setForm(f => ({ ...f, tipo_pessoa: t, documento: "" })); cnpjFilledAddress.current = false; }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${form.tipo_pessoa === t ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {t === "PJ" ? <Building2 className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
            {t === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
          </button>
        ))}
      </div>

      {isDuplicate && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">Este CPF/CNPJ já está cadastrado neste módulo.</div>}
      {cnpjError && <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">{cnpjError} — preencha os dados manualmente.</div>}
      {cnpjLoading && <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">Consultando CNPJ...</div>}
      {cepError && <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">{cepError}</div>}
      {cepLoading && <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">Consultando CEP...</div>}

      <div className="grid grid-cols-2 gap-3">
        {/* Documento */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">{isPJ ? "CNPJ" : "CPF"} *</label>
          <Input
            value={form.documento}
            onChange={e => isPJ ? handleCNPJ(e.target.value) : setForm(f => ({ ...f, documento: e.target.value }))}
            placeholder=""
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Razão Social / Nome *</label>
          <Input value={form.nome_fornecedor} onChange={e => setForm(f => ({ ...f, nome_fornecedor: e.target.value }))} />
        </div>

        {/* Nome Fantasia — apenas PJ */}
        {isPJ && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Nome Fantasia</label>
            <Input value={form.nome_fantasia || ""} onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))} />
          </div>
        )}

        {/* Situação ICMS + Inscrição Estadual — apenas PJ */}
        {isPJ && (
          <>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Situação ICMS *</label>
              <Select value={form.situacao_icms || ""} onValueChange={v => setForm(f => ({ ...f, situacao_icms: v, inscricao_estadual: v !== "Contribuinte" ? "" : f.inscricao_estadual }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contribuinte">Contribuinte</SelectItem>
                  <SelectItem value="Não Contribuinte">Não Contribuinte</SelectItem>
                  <SelectItem value="Contribuinte Isento">Contribuinte Isento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1 ${isContribuinte ? "text-slate-700" : "text-slate-400"}`}>Inscrição Estadual</label>
              <Input
                value={form.inscricao_estadual || ""}
                onChange={e => setForm(f => ({ ...f, inscricao_estadual: e.target.value }))}
                placeholder=""
                disabled={!isContribuinte}
                className={!isContribuinte ? "opacity-40 cursor-not-allowed bg-slate-50" : ""}
              />
            </div>
          </>
        )}

        {/* Contato */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Telefone *</label>
          <Input value={form.telefone || ""} onChange={e => setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Celular</label>
          <Input value={form.celular || ""} onChange={e => setForm(f => ({ ...f, celular: maskPhone(e.target.value) }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">E-mail *</label>
          <Input type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          {form.email && !isValidEmail(form.email) && <p className="text-xs text-red-500 mt-1">E-mail inválido</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Condição de Pagamento</label>
          <Input value={form.condicao_pagamento || ""} onChange={e => setForm(f => ({ ...f, condicao_pagamento: e.target.value }))} />
        </div>

        {/* Endereço — CEP com busca automática */}
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
          <label className="text-xs font-medium text-slate-700 block mb-1">Tipo de Fornecedor *</label>
          <TipoFornecedorSelect
            value={form.tipo_id || ""}
            onChange={v => setForm(f => ({ ...f, tipo_id: v }))}
            tipos={tipos}
            onCreateTipo={onCreateTipo}
            creating={creatingTipo}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Status</label>
          <Select value={form.status?.toLowerCase() || "ativo"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-700 block mb-1">Observações</label>
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={form.observacoes || ""}
            onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            placeholder=""
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={onSave}
          disabled={!canSave || isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function FornecedoresPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showError, showDelete } = useGlobalAlert();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("dados");

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["fornecedores", empresa_id],
    queryFn: () => fornecedoresService.list({ empresa_id }),
    enabled: !!empresa_id,
  });

  // Tipos de fornecedor dinâmicos (global)
  const { data: tiposFornecedor = [] } = useQuery({
    queryKey: ["fornecedor_tipos"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedor_tipos").select("*");
      return data || [];
    },
  });

  const criarTipo = useMutation({
    mutationFn: async (nome) => {
      const { data, error } = await supabase.from("fornecedor_tipos").insert({ nome }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries(["fornecedor_tipos"]),
    onError: (err) => showError({ title: "Tabela de tipos não configurada", description: err.message + "\n\nExecute o SQL de configuração no Supabase Dashboard (SQL Editor) para criar a tabela fornecedor_tipos." }),
  });

  // Pré-preenchimento via localStorage (vindo do FiscalPage)
  useEffect(() => {
    const raw = localStorage.getItem("fornecedor_pre_cadastro");
    if (raw) {
      try {
        const pre = JSON.parse(raw);
        localStorage.removeItem("fornecedor_pre_cadastro");
        setForm(f => ({ ...EMPTY_FORM, ...f, documento: pre.cnpj || "", nome_fornecedor: pre.razao_social || "" }));
        setActiveTab("dados");
        setModal({ mode: "create" });
      } catch (_) {}
    }
  }, []);

  const salvar = useMutation({
    mutationFn: (d) => {
      const data = { ...d };
      if (data.situacao_icms !== "Contribuinte") data.inscricao_estadual = "";
      if (data.status) data.status = data.status.toLowerCase();
      const codigo = d.id ? d.codigo : generateCodigo("FOR", fornecedores, "codigo");
      const data_cadastro = d.id ? d.data_cadastro : new Date().toISOString();
      const payload = sanitizeBySchema({ ...data, empresa_id, codigo, data_cadastro }, [...FORNECEDORES_COLUMNS, "codigo", "data_cadastro"]);
      return d.id ? fornecedoresService.update(d.id, payload) : fornecedoresService.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(["fornecedores"]); setModal(null); },
    onError: (err) => showError({ title: "Erro ao salvar", description: err.message }),
  });

  const deletar = useMutation({
    mutationFn: (id) => fornecedoresService.delete(id),
    onSuccess: () => qc.invalidateQueries(["fornecedores"]),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setActiveTab("dados"); setModal({ mode: "create" }); };
  const openEdit = (f) => { setForm({ ...EMPTY_FORM, ...f }); setActiveTab("dados"); setModal({ mode: "edit", fornecedor: f }); };
  const openView = (f) => { setForm({ ...EMPTY_FORM, ...f }); setActiveTab("dados"); setModal({ mode: "view", fornecedor: f }); };

  const filtered = fornecedores.filter(f =>
    !search ||
    f.nome_fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
    f.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
    f.documento?.includes(search) ||
    f.telefone?.includes(search) ||
    f.email?.toLowerCase().includes(search.toLowerCase())
  );

  const isReadOnly = modal?.mode === "view";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-sm text-slate-500 mt-0.5">{fornecedores.length} fornecedor(es) cadastrado(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder="Buscar por nome, CNPJ/CPF, telefone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-16">Código</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Fornecedor</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">CNPJ/CPF</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Telefone</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Cidade/UF</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum fornecedor encontrado</td></tr>}
            {filtered.map(f => (
              <tr key={f.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openView(f)}>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{f.codigo || "—"}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{f.nome_fornecedor}</p>
                  {f.nome_fantasia && <p className="text-xs text-slate-400">{f.nome_fantasia}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{f.documento}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{f.telefone || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{f.cidade}{f.estado ? ` / ${f.estado}` : ""}</td>
                <td className="px-4 py-3"><Badge className={STATUS_COLORS[f.status] || STATUS_COLORS.ativo}>{normalizeStatus(f.status)}</Badge></td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(f)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600 mr-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => showDelete({ onConfirm: () => deletar.mutateAsync(f.id) })} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto fixed top-4 left-1/2 -translate-x-1/2 translate-y-0 mt-0">
          <DialogHeader>
            <DialogTitle>
              {modal?.mode === "create" ? "Novo Fornecedor" : modal?.mode === "edit" ? "Editar Fornecedor" : "Dados do Fornecedor"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados Cadastrais</TabsTrigger>
              <TabsTrigger value="pagamento" className="flex-1">Pagamento</TabsTrigger>
              <TabsTrigger value="contatos" className="flex-1" disabled={!modal?.fornecedor?.id}>Contatos</TabsTrigger>
              <TabsTrigger value="observacoes" className="flex-1" disabled={!modal?.fornecedor?.id}>Observações</TabsTrigger>
            </TabsList>

            {/* ABA: Dados Cadastrais */}
            <TabsContent value="dados" className="mt-4">
              {isReadOnly ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Tipo", form.tipo_pessoa === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"],
                      ["CNPJ/CPF", form.documento],
                      ["Razão Social / Nome", form.nome_fornecedor],
                      ...(form.tipo_pessoa === "PJ" ? [
                        ["Nome Fantasia", form.nome_fantasia],
                        ["Inscrição Estadual", form.inscricao_estadual],
                      ] : []),
                      ["Telefone", form.telefone],
                      ["Celular", form.celular],
                      ["E-mail", form.email],
                      ...(form.tipo_pessoa === "PJ" ? [["Situação ICMS", form.situacao_icms]] : []),
                      ["Cond. Pagamento", form.condicao_pagamento],
                      ["Endereço", [form.endereco, form.numero].filter(Boolean).join(", ")],
                      ["Bairro / CEP", [form.bairro, form.cep].filter(Boolean).join(" — ")],
                      ["Cidade / Estado", [form.cidade, form.estado].filter(Boolean).join(" / ")],
                      ["Status", form.status],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-0.5">{label}</p>
                        <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded px-3 py-2">{value || "—"}</p>
                      </div>
                    ))}
                    {form.observacoes && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-0.5">Observações</p>
                        <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded px-3 py-2">{form.observacoes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Button onClick={() => setModal(m => ({ ...m, mode: "edit" }))} className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                  </div>
                </div>
              ) : (
                <FornecedorDadosForm
                  form={form}
                  setForm={setForm}
                  fornecedores={fornecedores}
                  isSaving={salvar.isPending}
                  onSave={() => salvar.mutate(form)}
                  onCancel={() => setModal(null)}
                  tipos={tiposFornecedor}
                  onCreateTipo={(nome) => criarTipo.mutateAsync(nome)}
                  creatingTipo={criarTipo.isPending}
                />
              )}
            </TabsContent>

            {/* ABA: Pagamento */}
            <TabsContent value="pagamento" className="mt-4">
              <FornecedorPagamentoTab
                fornecedorId={modal?.fornecedor?.id}
                empresaId={empresa_id}
              />
            </TabsContent>

            {/* ABA: Contatos */}
            <TabsContent value="contatos" className="mt-4">
              <FornecedorContatosTab fornecedorId={modal?.fornecedor?.id} empresaId={empresa_id} />
            </TabsContent>

            {/* ABA: Observações */}
            <TabsContent value="observacoes" className="mt-4">
              <FornecedorObservacoesTab fornecedorId={modal?.fornecedor?.id} empresaId={empresa_id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}