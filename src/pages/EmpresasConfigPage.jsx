import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/components/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Eye, Upload, X, ImageIcon } from "lucide-react";
import { useCNPJLookup } from "@/components/hooks/useCNPJLookup";
import { useCEPLookup } from "@/components/hooks/useCEPLookup";
import { maskPhone, isValidEmail } from "@/components/hooks/useFormValidation";
import { normalizeCNPJ, formatCNPJ } from "@/utils/cnpj";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

const EMPTY_FORM = {
  cnpj: "",
  razao_social: "",
  nome_fantasia: "",
  situacao_cadastral: "",
  data_abertura: "",
  inscricao_estadual: "",
  cep: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  email: "",
  telefone: "",
  status: "Ativo",
  logo_url: "",
};

const STATUS_COLORS = {
  Ativo: "bg-green-100 text-green-700",
  Inativo: "bg-slate-100 text-slate-600",
  Bloqueado: "bg-red-100 text-red-700",
};

async function listarEmpresas() {
  const { data } = await supabase.from("empresas_config").select("*").is("deleted_at", null);
  return data || [];
}

async function criarEmpresa(dados) {
  const { data } = await supabase.from("empresas_config").insert(dados).select().single();
  return data;
}

async function atualizarEmpresa(id, dados) {
  const { data } = await supabase.from("empresas_config").update(dados).eq("id", id).select().single();
  return data;
}

async function softDeleteEmpresa(id) {
  await supabase.from("empresas_config").update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

// ── Upload de logotipo ────────────────────────────────────────────────────────
function LogoUpload({ value, onChange, readOnly = false }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  if (!allowed.includes(file.type)) return;
  setUploading(true);
  try {
  const path = `logos/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
  if (!error) {
    const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
    onChange(publicUrl);
  }
  } finally {
  setUploading(false);
  }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-700 block">Logotipo da Empresa</label>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="border border-slate-200 rounded-lg p-2 bg-white">
            <img src={value} alt="Logo" className="max-h-20 max-w-[180px] object-contain" />
          </div>
          {!readOnly && (
            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-1.5 text-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Enviando..." : "Substituir"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
                className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" />
                Remover
              </Button>
            </div>
          )}
        </div>
      ) : (
        !readOnly && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-slate-500 hover:text-blue-600"
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">{uploading ? "Enviando..." : "Clique para fazer upload (PNG, JPG, SVG)"}</span>
          </button>
        )
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ── Formulário ────────────────────────────────────────────────────────────────
function EmpresaForm({ form, setForm, onSave, onCancel, isSaving, readOnly = false, cnpjEnriquecendo = false }) {
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
    setForm(f => ({ ...f, cnpj: formatted }));
    if (digits.length === 14) {
      clearError();
      lookupCNPJ(digits, (dados) => {
        const hasAddress = !!(dados.endereco || dados.logradouro);
        cnpjFilledAddress.current = hasAddress;
        const parseDate = (val) => {
          if (!val) return "";
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
          const parts = val.split("/");
          if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
          return val;
        };
        setForm(f => ({
          ...f,
          razao_social: dados.razao_social || dados.nome_transportadora || f.razao_social,
          nome_fantasia: dados.nome_fantasia || f.nome_fantasia,
          situacao_cadastral: dados.situacao_cadastral || f.situacao_cadastral,
          data_abertura: parseDate(dados.data_abertura) || f.data_abertura,
          endereco: dados.endereco || dados.logradouro || f.endereco,
          numero: dados.numero || f.numero,
          bairro: dados.bairro || f.bairro,
          cidade: dados.cidade || dados.municipio || f.cidade,
          estado: dados.estado || dados.uf || f.estado,
          cep: dados.cep || f.cep,
          email: dados.email || f.email,
          telefone: dados.telefone ? maskPhone(dados.telefone) : f.telefone,
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

  const required = [
    form.cnpj, form.razao_social, form.nome_fantasia, form.situacao_cadastral,
    form.data_abertura, form.cep, form.endereco, form.numero, form.bairro,
    form.cidade, form.estado, form.email, form.telefone,
  ];
  const emailOk = isValidEmail(form.email);
  const canSave = required.every(v => v && v.trim && v.trim() !== "") && emailOk;

  const field = (label, key, props = {}) => (
    <div>
      <label className="text-xs font-medium text-slate-700 block mb-1">{label}</label>
      <Input
        value={form[key] || ""}
        onChange={e => !readOnly && setForm(f => ({ ...f, [key]: e.target.value }))}
        readOnly={readOnly}
        className={readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}
        {...props}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {!readOnly && cnpjError && <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">{cnpjError} — preencha os dados manualmente.</div>}
      {!readOnly && (cnpjLoading || cnpjEnriquecendo) && <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">Consultando CNPJ e enriquecendo dados automaticamente...</div>}
      {!readOnly && cepError && <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">{cepError}</div>}
      {!readOnly && cepLoading && <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">Consultando CEP...</div>}

      {/* Logotipo */}
      <LogoUpload
        value={form.logo_url || ""}
        onChange={url => setForm(f => ({ ...f, logo_url: url }))}
        readOnly={readOnly}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">CNPJ *</label>
          <Input
            value={form.cnpj}
            onChange={e => !readOnly && handleCNPJ(e.target.value)}
            readOnly={readOnly}
            className={readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}
          />
        </div>
        {field("Razão Social *", "razao_social")}
        {field("Nome Fantasia *", "nome_fantasia")}
        {field("Situação Cadastral *", "situacao_cadastral")}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Data de Abertura *</label>
          <Input
            type={readOnly ? "text" : "date"}
            value={form.data_abertura || ""}
            onChange={e => !readOnly && setForm(f => ({ ...f, data_abertura: e.target.value }))}
            readOnly={readOnly}
            className={readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}
          />
        </div>
        {field("Insc. Estadual", "inscricao_estadual")}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">CEP *</label>
          <Input
            value={form.cep || ""}
            onChange={e => !readOnly && handleCEP(e.target.value)}
            readOnly={readOnly}
            className={readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}
          />
        </div>
        <div className="col-span-2">{field("Endereço *", "endereco")}</div>
        {field("Número *", "numero")}
        {field("Bairro *", "bairro")}
        {field("Cidade *", "cidade")}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Estado *</label>
          <Input
            value={form.estado || ""}
            onChange={e => !readOnly && setForm(f => ({ ...f, estado: e.target.value }))}
            readOnly={readOnly}
            maxLength={2}
            className={readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">E-mail *</label>
          <Input
            type="email"
            value={form.email || ""}
            onChange={e => !readOnly && setForm(f => ({ ...f, email: e.target.value }))}
            readOnly={readOnly}
            className={readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}
          />
          {form.email && !isValidEmail(form.email) && <p className="text-xs text-red-500 mt-1">E-mail inválido</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Telefone *</label>
          <Input
            value={form.telefone || ""}
            onChange={e => !readOnly && setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))}
            readOnly={readOnly}
            className={readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Status *</label>
          {readOnly ? (
            <div className="h-9 flex items-center">
              <Badge className={STATUS_COLORS[form.status] || STATUS_COLORS.Ativo}>{form.status}</Badge>
            </div>
          ) : (
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>{readOnly ? "Fechar" : "Cancelar"}</Button>
        {!readOnly && (
          <Button onClick={onSave} disabled={!canSave || isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function EmpresasConfigPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { showConfirm, showError, showAlert } = useGlobalAlert();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { mode: "create" | "edit" | "view", empresa? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [cnpjEnriquecendo, setCnpjEnriquecendo] = useState(false);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas_config"],
    queryFn: listarEmpresas,
  });

  // ── Detecta pré-cadastro vindo do FiscalPage ─────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("empresa_pre_cadastro");
    if (!raw) return;
    try {
      const pre = JSON.parse(raw);
      localStorage.removeItem("empresa_pre_cadastro");

      // Preenche form com dados do XML
      const formInicial = {
        ...EMPTY_FORM,
        cnpj: pre.cnpj || "",
        razao_social: pre.razao_social || "",
        nome_fantasia: pre.nome_fantasia || "",
        inscricao_estadual: pre.inscricao_estadual || "",
        endereco: pre.endereco || "",
        numero: pre.numero || "",
        bairro: pre.bairro || "",
        cidade: pre.cidade || "",
        estado: pre.estado || "",
        cep: pre.cep || "",
      };
      setForm(formInicial);
      setModal({ mode: "create" });

      // Enriquece via CNPJ se válido
      const digits = (pre.cnpj || "").replace(/\D/g, "");
      if (digits.length === 14) {
        setCnpjEnriquecendo(true);
        fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`).then(r => r.json())
          .then(res => {
            const dados = res || {};
            if (dados && (dados.razao_social || dados.nome)) {
              const parseDate = (val) => {
                if (!val) return "";
                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
                const parts = val.split("/");
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                return val;
              };
              setForm(f => ({
                ...f,
                razao_social: f.razao_social || dados.razao_social || dados.nome || "",
                nome_fantasia: f.nome_fantasia || dados.nome_fantasia || "",
                situacao_cadastral: f.situacao_cadastral || dados.situacao_cadastral || "",
                data_abertura: f.data_abertura || parseDate(dados.data_abertura) || "",
                endereco: f.endereco || dados.logradouro || dados.endereco || "",
                numero: f.numero || dados.numero || "",
                bairro: f.bairro || dados.bairro || "",
                cidade: f.cidade || dados.municipio || dados.cidade || "",
                estado: f.estado || dados.uf || dados.estado || "",
                cep: f.cep || dados.cep || "",
                email: f.email || dados.email || "",
                telefone: f.telefone || (dados.telefone ? maskPhone(dados.telefone) : "") || "",
              }));
            }
          })
          .catch(() => {
            showError({
              title: "Falha ao consultar CNPJ",
              description: "Os dados do XML foram mantidos. Complemente manualmente.",
            });
          })
          .finally(() => setCnpjEnriquecendo(false));
      }
    } catch (_) {}
  }, []);

  const salvar = useMutation({
    mutationFn: async (d) => {
      const cnpjNorm = normalizeCNPJ(d.cnpj);
      // Validação de duplicidade (frontend)
      if (!d.id) {
        const duplicata = (empresas || []).find(e => normalizeCNPJ(e.cnpj) === cnpjNorm);
        if (duplicata) {
          throw new Error("Este CNPJ já está cadastrado no sistema.");
        }
      }
      // Salva sempre com CNPJ normalizado
      const dadosNorm = { ...d, cnpj: cnpjNorm };
      return dadosNorm.id ? atualizarEmpresa(dadosNorm.id, dadosNorm) : criarEmpresa(dadosNorm);
    },
    onSuccess: () => {
      qc.invalidateQueries(["empresas_config"]);
      setModal(null);
      // Verifica se veio do FiscalPage para retornar
      const voltarFiscal = sessionStorage.getItem("empresa_retornar_fiscal");
      if (voltarFiscal) {
        sessionStorage.removeItem("empresa_retornar_fiscal");
        showAlert({
          type: "success",
          title: "Empresa cadastrada com sucesso!",
          description: "Retornando para importação da nota fiscal.",
          confirmLabel: "Ir para Fiscal",
          cancelLabel: null,
          onConfirm: () => navigate("/FiscalPage"),
        });
      }
    },
    onError: (err) => showError({ title: "Erro ao salvar", description: err.message }),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ mode: "create" }); };
  const openEdit   = (e) => { setForm({ ...EMPTY_FORM, ...e }); setModal({ mode: "edit", empresa: e }); };
  const openView   = (e) => { setForm({ ...EMPTY_FORM, ...e }); setModal({ mode: "view", empresa: e }); };

  const handleDelete = (e) => {
    showConfirm({
      title: "Deseja excluir esta empresa?",
      description: "Esta ação não poderá ser desfeita.",
      confirmLabel: "Excluir",
      confirmVariant: "destructive",
      onConfirm: async () => {
        await softDeleteEmpresa(e.id);
        qc.invalidateQueries(["empresas_config"]);
      },
    });
  };

  const filtered = (Array.isArray(empresas) ? empresas : []).filter(e =>
    !search ||
    e.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
    e.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj?.includes(search) ||
    e.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const modalTitle = modal?.mode === "create" ? "Nova Empresa"
    : modal?.mode === "edit" ? "Editar Empresa"
    : "Visualizar Empresa";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações da Empresa</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} empresa(s) cadastrada(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nova Empresa
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
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Logo</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">CNPJ</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Razão Social</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome Fantasia</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Cidade/UF</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhuma empresa cadastrada</td></tr>
            )}
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  {e.logo_url ? (
                    <img src={e.logo_url} alt="logo" className="h-8 max-w-[60px] object-contain" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.cnpj}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{e.razao_social}</td>
                <td className="px-4 py-3 text-slate-600">{e.nome_fantasia}</td>
                <td className="px-4 py-3 text-slate-600">{e.cidade}{e.estado ? ` / ${e.estado}` : ""}</td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_COLORS[e.status] || STATUS_COLORS.Ativo}>{e.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openView(e)} className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(e)} className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(e)} className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto fixed top-4 left-1/2 -translate-x-1/2 translate-y-0">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          <EmpresaForm
            form={form}
            setForm={setForm}
            isSaving={salvar.isPending || cnpjEnriquecendo}
            readOnly={modal?.mode === "view"}
            onSave={() => salvar.mutate(form)}
            onCancel={() => setModal(null)}
            cnpjEnriquecendo={cnpjEnriquecendo}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}