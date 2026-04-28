import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transportadorasService } from "@/components/services/administracaoService";
import { sanitizeBySchema } from "@/components/services/baseService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { cn } from "@/lib/utils";
import { ErpTableContainer } from "@/components/design-system";
import CNPJLookupInput from "@/components/forms/CNPJLookupInput";
import { useCEPLookup } from "@/components/hooks/useCEPLookup";
import { maskPhone, isValidEmail, generateCodigo, isDuplicateDocument } from "@/components/hooks/useFormValidation";

function TransportadoraForm({ formData, setFormData, editingId }) {
  const { loading: cepLoading, lookupCEP } = useCEPLookup();
  const cnpjFilledAddress = useRef(false);

  const isContribuinte = formData.situacao_ie === "Contribuinte";

  const handleCEP = (val) => {
    const digits = val.replace(/\D/g, "");
    const formatted = digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2").slice(0, 9);
    setFormData(prev => ({ ...prev, cep: formatted }));
    if (digits.length === 8 && !cnpjFilledAddress.current) {
      lookupCEP(digits, (end) => {
        setFormData(prev => ({
          ...prev,
          endereco: end.logradouro || end.endereco || prev.endereco,
          bairro: end.bairro || prev.bairro,
          cidade: end.cidade || end.localidade || prev.cidade,
          estado: end.estado || end.uf || prev.estado,
        }));
      });
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="text-sm font-medium text-slate-900 block mb-2">CNPJ *</label>
        <CNPJLookupInput
          value={formData.cnpj || ""}
          onChange={(v) => setFormData(prev => ({ ...prev, cnpj: v }))}
          onDataFound={(dados) => {
            const hasAddress = !!(dados.endereco || dados.logradouro);
            cnpjFilledAddress.current = hasAddress;
            setFormData(prev => ({
              ...prev,
              cnpj: dados.cnpj || prev.cnpj,
              nome_transportadora: dados.nome_transportadora || dados.razao_social || prev.nome_transportadora,
              nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
              endereco: dados.endereco || dados.logradouro || prev.endereco,
              numero: dados.numero || prev.numero,
              bairro: dados.bairro || prev.bairro,
              cidade: dados.cidade || dados.municipio || prev.cidade,
              estado: dados.estado || dados.uf || prev.estado,
              cep: dados.cep || prev.cep,
              email: dados.email || prev.email,
              telefone: dados.telefone || prev.telefone,
            }));
          }}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-900 block mb-1">Razão Social *</label>
        <Input value={formData.nome_transportadora || ""} onChange={(e) => setFormData(prev => ({ ...prev, nome_transportadora: e.target.value }))} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-900 block mb-1">Nome Fantasia *</label>
        <Input value={formData.nome_fantasia || ""} onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))} />
      </div>

      {/* Situação ICMS + Inscrição Estadual */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">Situação ICMS *</label>
          <Select
            value={formData.situacao_ie || ""}
            onValueChange={(v) => setFormData(prev => ({ ...prev, situacao_ie: v, inscricao_estadual: v !== "Contribuinte" ? "" : prev.inscricao_estadual }))}
          >
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Contribuinte">Contribuinte</SelectItem>
              <SelectItem value="Não Contribuinte">Não Contribuinte</SelectItem>
              <SelectItem value="Contribuinte Isento">Contribuinte Isento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={`text-sm font-medium block mb-1 ${isContribuinte ? "text-slate-900" : "text-slate-400"}`}>Inscrição Estadual</label>
          <Input
            value={formData.inscricao_estadual || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
            disabled={!isContribuinte}
            className={!isContribuinte ? "opacity-40 cursor-not-allowed bg-slate-50" : ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">E-mail *</label>
          <Input type="email" value={formData.email || ""} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
          {formData.email && !isValidEmail(formData.email) && <p className="text-xs text-red-500 mt-1">E-mail inválido</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">Telefone *</label>
          <Input value={formData.telefone || ""} onChange={(e) => setFormData(prev => ({ ...prev, telefone: maskPhone(e.target.value) }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">CEP *</label>
          <Input value={formData.cep || ""} onChange={(e) => handleCEP(e.target.value)} />
          {cepLoading && <p className="text-xs text-blue-600 mt-1">Consultando CEP...</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">Número *</label>
          <Input value={formData.numero || ""} onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-900 block mb-1">Endereço *</label>
        <Input value={formData.endereco || ""} onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">Bairro *</label>
          <Input value={formData.bairro || ""} onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">Cidade *</label>
          <Input value={formData.cidade || ""} onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">Estado *</label>
          <Input value={formData.estado || ""} onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))} maxLength="2" />
        </div>
      </div>
      {editingId && (
        <div>
          <label className="text-sm font-medium text-slate-900 block mb-1">Status</label>
          <Select value={formData.status || "ativo"} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-slate-900 block mb-1">Observações</label>
        <Input value={formData.observacoes || ""} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} />
      </div>
    </div>
  );
}

export default function TransportadorasPage() {
  const { empresa_id } = useEmpresa();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const qc = useQueryClient();
  const { showError, showDelete } = useGlobalAlert();

  const { data: transportadoras = [] } = useQuery({
    queryKey: ["transportadoras", empresa_id],
    queryFn: () => transportadorasService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const filteredTransportadoras = useMemo(() => {
    if (!searchTerm) return transportadoras;
    const term = searchTerm.toLowerCase();
    return transportadoras.filter(t => 
      t.nome_transportadora?.toLowerCase().includes(term) ||
      t.cnpj?.includes(searchTerm) ||
      t.email?.toLowerCase().includes(term)
    );
  }, [transportadoras, searchTerm]);

  const criarMutation = useMutation({
    mutationFn: (data) => transportadorasService.criar({ ...data, empresa_id }),
    onSuccess: () => { qc.invalidateQueries(["transportadoras"]); closeModal(); },
    onError: (err) => showError({ title: "Erro ao salvar", description: err.message }),
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }) => transportadorasService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries(["transportadoras"]); closeModal(); },
    onError: (err) => showError({ title: "Erro ao salvar", description: err.message }),
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => transportadorasService.deletar(id),
    onSuccess: () => qc.invalidateQueries(["transportadoras"]),
  });

  const closeModal = () => {
    setModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  const TRANSPORTADORAS_COLUMNS = [
    'empresa_id', 'nome_transportadora', 'nome_fantasia', 'cnpj', 'inscricao_estadual',
    'situacao_ie', 'email', 'telefone', 'endereco', 'numero', 'bairro', 'cidade',
    'estado', 'cep', 'observacoes', 'status'
  ];

  const sanitizeFormData = (data) => sanitizeBySchema(data, TRANSPORTADORAS_COLUMNS);

  const [formErrors, setFormErrors] = useState([]);

  const handleSubmit = async () => {
    const errors = [];
    const required = [formData.nome_transportadora, formData.cnpj, formData.email, formData.telefone, formData.cep, formData.endereco, formData.numero, formData.bairro, formData.cidade, formData.estado, formData.situacao_ie];
    if (required.some(v => !v || !v.toString().trim())) {
      errors.push("Preencha todos os campos obrigatórios.");
    }
    if (formData.email && !isValidEmail(formData.email)) {
      errors.push("E-mail inválido.");
    }
    const dupCheck = isDuplicateDocument(formData.cnpj, transportadoras, "cnpj", editingId);
    if (dupCheck) {
      errors.push("Este CNPJ já está cadastrado neste módulo.");
    }
    if (errors.length > 0) { setFormErrors(errors); return; }
    setFormErrors([]);
    const codigo = editingId ? formData.codigo : generateCodigo("TRA", transportadoras, "codigo");
    const data_cadastro = editingId ? formData.data_cadastro : new Date().toISOString();
    const payload = sanitizeBySchema({ ...sanitizeFormData(formData), codigo, data_cadastro }, [...TRANSPORTADORAS_COLUMNS, "codigo", "data_cadastro"]);
    if (editingId) {
      editarMutation.mutate({ id: editingId, data: payload });
    } else {
      criarMutation.mutate({ ...payload, status: "ativo" });
    }
  };

  const handleEdit = (row) => {
    setFormData(row);
    setEditingId(row.id);
    setModalOpen(true);
  };

  const openCreate = () => { setFormData({}); setEditingId(null); setModalOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transportadoras</h1>
          <p className="text-sm text-slate-500 mt-0.5">{transportadoras.length} transportadora(s) cadastrada(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nova Transportadora
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Input
          className="pl-9"
          placeholder="Buscar por nome, CNPJ ou email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
      </div>

      {/* Tabela */}
      <ErpTableContainer>
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-900 w-[8%]">Código</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 w-[20%]">Nome</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 w-[16%]">CNPJ</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 w-[20%]">E-mail</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 w-[12%]">Telefone</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 w-[12%]">Cidade/UF</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 w-[8%]">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900 w-[7%]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransportadoras.map(t => (
              <tr key={t.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleEdit(t)}>
                <td className="px-4 py-4 text-xs font-mono text-slate-500">{t.codigo || "—"}</td>
                <td className="px-4 py-4 font-medium truncate max-w-0">
                  <span className="block truncate" title={t.nome_transportadora}>{t.nome_transportadora}</span>
                  {t.nome_fantasia && <span className="block truncate text-xs text-slate-400" title={t.nome_fantasia}>{t.nome_fantasia}</span>}
                </td>
                <td className="px-4 py-4 text-slate-600 font-mono text-xs">{t.cnpj || "-"}</td>
                <td className="px-4 py-4 text-slate-600 text-xs truncate max-w-0">
                  <span className="block truncate" title={t.email}>{t.email || "-"}</span>
                </td>
                <td className="px-4 py-4 text-slate-600 text-xs">{t.telefone || "-"}</td>
                <td className="px-4 py-4 text-slate-600 text-xs">{t.cidade ? `${t.cidade}/${t.estado}` : "-"}</td>
                <td className="px-4 py-4">
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", 
                   t.status === "ativo" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                   {t.status === "ativo" ? "Ativo" : "Bloq."}
                  </span>
                </td>
                <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-amber-100 rounded transition-colors text-amber-600" title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => showDelete({ title: "Excluir Transportadora", description: `Tem certeza que deseja excluir "${t.nome_transportadora}"?`, onConfirm: () => deletarMutation.mutateAsync(t.id) })} className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ErpTableContainer>

      {/* Modal de Formulário */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto fixed top-4 left-1/2 -translate-x-1/2 translate-y-0">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Transportadora" : "Nova Transportadora"}</DialogTitle>
          </DialogHeader>
          <TransportadoraForm formData={formData} setFormData={setFormData} editingId={editingId} />
          {formErrors.length > 0 && (
            <div className="space-y-1">
              {formErrors.map((e, i) => <p key={i} className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">{e}</p>)}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={criarMutation.isPending || editarMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {editingId ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}