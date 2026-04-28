/**
 * Aba Logística — OrcamentoModal
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// ── Helpers monetários ────────────────────────────────────────────────────────
function parseMoeda(str) {
  if (!str && str !== 0) return 0;
  const limpo = String(str).replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(limpo) || 0;
}

function fmtMoeda(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
const VAZIO = {
  tipo_frete: "",
  modalidade_frete: "",
  valor_frete: 0,
  numero_cotacao: "",
  transportadora: "",
  local_entrega: "",
  observacoes_logistica: "",
};

export default function AbaLogisticaOrcamento({ orcamentoId, empresaId, clienteId, garantirOrcamentoId, onRegisterSave, formExterno, onFormChange }) {
  const qc = useQueryClient();
  const { showError } = useGlobalAlert();
  // Usa estado externo (elevado) se fornecido, caso contrário estado local
  const [formLocal, setFormLocal] = useState({ ...VAZIO });
  const form = formExterno ?? formLocal;
  const setForm = onFormChange ?? setFormLocal;

  const [valorFreteDisplay, setValorFreteDisplay] = useState("");
  const [carregado, setCarregado] = useState(false);
  const [idLocal, setIdLocal] = useState(orcamentoId);

  useEffect(() => {
    if (orcamentoId) setIdLocal(orcamentoId);
  }, [orcamentoId]);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Carrega dados existentes do orçamento
  const { data: orcamento } = useQuery({
    queryKey: ["orcamento-logistica", idLocal],
    queryFn: async () => {
      const { data } = await supabase.from("com_orcamentos").select("*").eq("id", idLocal).maybeSingle();
      return data || null;
    },
    enabled: !!idLocal,
  });

  useEffect(() => {
    if (orcamento && !carregado) {
      const f = {
        tipo_frete: orcamento.tipo_frete || "",
        modalidade_frete: orcamento.modalidade_frete || "",
        valor_frete: parseFloat(orcamento.valor_frete) || 0,
        numero_cotacao: orcamento.numero_cotacao || "",
        transportadora: orcamento.transportadora || "",
        local_entrega: orcamento.local_entrega || "",
        observacoes_logistica: orcamento.observacoes_logistica || "",
      };
      setForm(f);
      setValorFreteDisplay(fmtMoeda(f.valor_frete));
      setCarregado(true);
    }
  }, [orcamento, carregado]);

  // Sincroniza display do valor quando form externo muda (ex: ao voltar para aba)
  useEffect(() => {
    if (formExterno && formExterno.valor_frete != null) {
      setValorFreteDisplay(fmtMoeda(formExterno.valor_frete));
    }
  }, [formExterno?.valor_frete]);

  // Modalidades de frete — tabela: modalidade_frete, coluna: nome_modalidade
  const { data: modalidades = [] } = useQuery({
    queryKey: ["modalidades-frete", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("modalidade_frete").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
  });

  // Transportadoras
  const { data: transportadoras = [] } = useQuery({
    queryKey: ["transportadoras-orcamento", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("transportadoras").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
  });

  // Endereços do cliente (apenas se houver clienteId = cliente cadastrado)
  const { data: enderecos = [] } = useQuery({
    queryKey: ["cliente-enderecos-orcamento", clienteId],
    queryFn: async () => {
      const { data } = await supabase.from("cliente_enderecos").select("*").eq("cliente_id", clienteId);
      return data || [];
    },
    enabled: !!clienteId,
  });

  const temEnderecosCliente = clienteId && enderecos.length > 0;

  // Validação
  const validarLogistica = () => {
    const erros = [];
    if (!form.tipo_frete) erros.push("Tipo de frete (CIF/FOB)");
    if (!form.modalidade_frete) erros.push("Modalidade");
    if (!form.valor_frete || form.valor_frete === 0) erros.push("Valor do frete");
    return erros;
  };

  // Salvar
  // Registra função de save para ser chamada externamente (ex: ao trocar de aba ou ao salvar pagamento)
  useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave((idExterno) => salvarDados(idExterno));
    }
  }, [form, idLocal]);

  const salvarDados = async (idExterno) => {
    // Usa id externo (passado pelo pagamento) ou o local
    let id = idExterno || idLocal;
    if (!id && garantirOrcamentoId) {
      id = await garantirOrcamentoId();
      setIdLocal(id);
    }
    if (!id) return;
    // Não valida campos obrigatórios quando chamado pelo save do pagamento
    // (logística é opcional no fluxo de salvar)
    const errosValidacao = validarLogistica();
    if (errosValidacao.length > 0 && !idExterno) {
      showError({
        title: "Campos obrigatórios",
        description: `Preencha: ${errosValidacao.join(", ")}`,
      });
      return Promise.reject(new Error("Validação falhou"));
    }
    const payload = { tipo_frete: form.tipo_frete || null, modalidade_frete: form.modalidade_frete || null, valor_frete: form.valor_frete || 0, numero_cotacao: form.numero_cotacao || null, transportadora: form.transportadora || null, local_entrega: form.local_entrega || null, observacoes_logistica: form.observacoes_logistica || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("com_orcamentos").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  };

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const errosValidacao = validarLogistica();
      if (errosValidacao.length > 0) throw new Error(`Preencha: ${errosValidacao.join(", ")}`);
      let id = idLocal;
      if (!id && garantirOrcamentoId) { id = await garantirOrcamentoId(); setIdLocal(id); }
      if (!id) throw new Error("Orçamento não identificado");
      const payload = { tipo_frete: form.tipo_frete || null, modalidade_frete: form.modalidade_frete || null, valor_frete: form.valor_frete || 0, numero_cotacao: form.numero_cotacao || null, transportadora: form.transportadora || null, local_entrega: form.local_entrega || null, observacoes_logistica: form.observacoes_logistica || null, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("com_orcamentos").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries(["orcamento-logistica", idLocal]);
    },
    onError: (err) => {
      showError({ title: "Erro ao salvar", description: err?.message || "Erro desconhecido" });
    },
  });

  const handleValorFreteChange = (e) => {
    // Permite apenas dígitos e vírgula
    const raw = e.target.value.replace(/[^\d,]/g, "");
    setValorFreteDisplay(raw);
  };

  const handleValorFreteBlur = () => {
    const n = parseMoeda(valorFreteDisplay);
    setForm(prev => ({ ...prev, valor_frete: n }));
    setValorFreteDisplay(fmtMoeda(n));
  };

  const handleValorFreteFocus = () => {
    // Remove formatação ao focar para facilitar edição
    if (form.valor_frete === 0) {
      setValorFreteDisplay("");
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">Informações de Logística</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Tipo de Frete */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Tipo de Frete *</Label>
          <Select value={form.tipo_frete || ""} onValueChange={v => setField("tipo_frete", v)}>
            <SelectTrigger className="bg-white h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CIF">CIF</SelectItem>
              <SelectItem value="FOB">FOB</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Modalidade — lista suspensa da tabela modalidade_frete */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Modalidade *</Label>
          <Select value={form.modalidade_frete || ""} onValueChange={v => setField("modalidade_frete", v)}>
            <SelectTrigger className="bg-white h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {modalidades.map((m, idx) => (
                <SelectItem key={m.id || idx} value={m.nome_modalidade}>
                  {m.nome_modalidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Número da Cotação — vem ANTES do Valor do Frete */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Número da Cotação</Label>
          <Input
            className="bg-white h-9"
            value={form.numero_cotacao}
            onChange={e => setField("numero_cotacao", e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Valor do Frete */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Valor do Frete (R$) *</Label>
          <Input
            className="bg-white h-9 text-right font-mono"
            value={valorFreteDisplay}
            onChange={handleValorFreteChange}
            onBlur={handleValorFreteBlur}
            onFocus={handleValorFreteFocus}
          />
        </div>

        {/* Transportadora */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Transportadora</Label>
          <Select value={form.transportadora || ""} onValueChange={v => setField("transportadora", v)}>
            <SelectTrigger className="bg-white h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {transportadoras.map((t, idx) => (
                <SelectItem key={t.id || idx} value={t.nome_transportadora}>
                  {t.nome_transportadora}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Local de Entrega — lista suspensa se cliente cadastrado, livre caso contrário */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Local de Entrega</Label>
          {temEnderecosCliente ? (
            <Select value={form.local_entrega || ""} onValueChange={v => setField("local_entrega", v)}>
              <SelectTrigger className="bg-white h-9">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {enderecos.map((e, idx) => {
                  const label = [e.rua, e.numero, e.cidade].filter(Boolean).join(", ");
                  return (
                    <SelectItem key={e.id || idx} value={label}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="bg-white h-9"
              value={form.local_entrega}
              onChange={e => setField("local_entrega", e.target.value)}
              autoComplete="off"
            />
          )}
        </div>

      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Observações</Label>
        <textarea
          className="w-full min-h-[96px] rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          value={form.observacoes_logistica}
          onChange={e => setField("observacoes_logistica", e.target.value)}
        />
      </div>

      {/* Botão salvar removido — salvamento ocorre apenas na aba Pagamento */}
    </div>
  );
}