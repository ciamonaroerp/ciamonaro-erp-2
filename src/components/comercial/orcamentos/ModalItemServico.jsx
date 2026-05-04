/**
 * Modal de Item — Tipo Serviço
 * Layout e comportamento idênticos ao ModalItemProduto
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function fmtMoeda(v) {
  // Aceita número direto ou string formatada pt-BR
  let n;
  if (typeof v === "number") {
    n = v;
  } else {
    // string "1.234,56" → 1234.56
    n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0;
  }
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoeda(str) {
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}

export default function ModalItemServico({ open, onClose, onSalvar, empresaId, proximaSequencia, itemEdicao = null }) {
  const [form, setForm] = useState({
    sequencia: proximaSequencia || 1,
    quantidade: "",
    personalizacoes: [],
    operacoes: [],
    observacoes: "",
    valor_unitario: "",
    subtotal: "0,00",
  });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (itemEdicao) {
      setForm({
        ...itemEdicao,
        quantidade: itemEdicao.quantidade != null ? String(itemEdicao.quantidade) : "",
        valor_unitario: fmtMoeda(itemEdicao.valor_unitario || 0),
        subtotal: fmtMoeda(itemEdicao.subtotal || 0),
      });
    } else {
      setForm(prev => ({
        ...prev,
        sequencia: proximaSequencia || 1,
        quantidade: "",
        valor_unitario: "",
        subtotal: "0,00",
        personalizacoes: [],
        operacoes: [],
        observacoes: "",
      }));
    }
  }, [itemEdicao, proximaSequencia]);

  const { data: personalizacoes = [] } = useQuery({
    queryKey: ["orcamento-personalizacoes", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("config_personalizacoes").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: dependencias = [] } = useQuery({
    queryKey: ["orcamento-dependencias", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("config_dependencias").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const calcSubtotal = useCallback((qtd, vu) => {
    const q = parseInt(qtd) || 0;
    const v = parseMoeda(vu);
    return fmtMoeda(q * v);
  }, []);

  // Apenas inteiros positivos (igual ao ModalItemProduto)
  const handleQtd = (val) => {
    const qtd = val.replace(/\D/g, "").slice(0, 6);
    const sub = calcSubtotal(qtd, form.valor_unitario);
    setForm(prev => ({ ...prev, quantidade: qtd, subtotal: sub }));
  };

  // Máscara monetária por centavos (igual ao ModalItemProduto)
  const handleValorUnitario = (raw) => {
    const digits = raw.replace(/\D/g, "");
    const cents = parseInt(digits || "0", 10);
    const formatted = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sub = calcSubtotal(form.quantidade, formatted);
    setForm(prev => ({ ...prev, valor_unitario: formatted, subtotal: sub }));
  };

  const togglePersonalizacao = (tipo) => {
    setForm(prev => {
      const lista = prev.personalizacoes || [];
      return { ...prev, personalizacoes: lista.includes(tipo) ? lista.filter(a => a !== tipo) : [...lista, tipo] };
    });
  };

  const handleOperacaoQtd = (tipo, qtd) => {
    setForm(prev => {
      const ops = [...(prev.operacoes || [])];
      const idx = ops.findIndex(o => o.tipo === tipo);
      if (idx >= 0) {
        if (!qtd || parseInt(qtd) === 0) ops.splice(idx, 1);
        else ops[idx] = { tipo, quantidade: parseInt(qtd) };
      } else if (qtd && parseInt(qtd) > 0) {
        ops.push({ tipo, quantidade: parseInt(qtd) });
      }
      return { ...prev, operacoes: ops };
    });
  };

  const getOperacaoQtd = (tipo) => {
    const op = (form.operacoes || []).find(o => o.tipo === tipo);
    return op ? String(op.quantidade) : "";
  };

  const validar = () => {
    const e = {};
    if (!form.quantidade || parseInt(form.quantidade) < 1) e.quantidade = "Obrigatório";
    if (!form.valor_unitario || parseMoeda(form.valor_unitario) <= 0) e.valor_unitario = "Obrigatório";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSalvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const valorUnitario = parseMoeda(form.valor_unitario);
      const quantidade = parseInt(form.quantidade);
      const payload = {
        sequencia: parseInt(form.sequencia),
        tipo_item: "Serviço",
        quantidade,
        personalizacoes: form.personalizacoes,
        operacoes: form.operacoes,
        observacoes: form.observacoes || null,
        valor_unitario: valorUnitario,
        subtotal: valorUnitario * quantidade,
        produto_percentual: 0,
        servico_percentual: 100,
      };
      await onSalvar(payload, itemEdicao?.id);
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {itemEdicao ? "Editar Item —" : "Novo Item —"} Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">

          {/* LINHA 1: Quantidade + Descrição livre */}
          <div className="flex items-start gap-3">
            {/* Quantidade */}
            <div className="space-y-1 w-[100px] shrink-0">
              <Label className="text-xs font-medium text-slate-600">Qtd *</Label>
              <Input
                value={form.quantidade}
                onChange={e => handleQtd(e.target.value)}
                className={`h-9 text-sm text-center font-mono ${erros.quantidade ? "border-red-400" : ""}`}
                placeholder=""
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
              />
              {erros.quantidade && <p className="text-xs text-red-500">{erros.quantidade}</p>}
            </div>

            {/* Observações inline (descrição do serviço) */}
            <div className="space-y-1 flex-1 min-w-0">
              <Label className="text-xs font-medium text-slate-600">Descrição do Serviço</Label>
              <textarea
                value={form.observacoes}
                onChange={e => setField("observacoes", e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none h-9 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Descreva o serviço..."
                style={{ minHeight: "36px" }}
              />
            </div>
          </div>

          {/* Personalizações */}
          {personalizacoes.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Tipo de Personalização</Label>
              <div className="flex flex-wrap gap-2">
                {personalizacoes.map(p => {
                  const sel = (form.personalizacoes || []).includes(p.tipo_personalizacao);
                  return (
                    <button key={p.id} type="button"
                      onClick={() => togglePersonalizacao(p.tipo_personalizacao)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sel ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"}`}
                    >
                      {p.tipo_personalizacao}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operações / Dependências */}
          {dependencias.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Quantidade de Operações</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dependencias.map(d => (
                  <div key={d.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <span className="flex-1 text-xs text-slate-600 truncate">{d.tipo_dependencia}</span>
                    <Input
                      className="h-6 w-14 text-xs font-mono text-center p-1"
                      value={getOperacaoQtd(d.tipo_dependencia)}
                      onChange={e => handleOperacaoQtd(d.tipo_dependencia, e.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder=""
                      inputMode="numeric"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valores — idêntico ao ModalItemProduto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Valor Unitário (R$) *</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-slate-400 pointer-events-none">R$</span>
                <Input
                  className={`h-9 text-sm pl-8 text-right font-mono ${erros.valor_unitario ? "border-red-400" : ""}`}
                  value={form.valor_unitario}
                  onChange={e => handleValorUnitario(e.target.value)}
                  onFocus={e => e.target.select()}
                  placeholder="0,00"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              {erros.valor_unitario && <p className="text-xs text-red-500">{erros.valor_unitario}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Sub-total (R$)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-slate-400 pointer-events-none">R$</span>
                <Input
                  className="h-9 text-sm pl-8 text-right font-mono font-semibold text-blue-700 bg-slate-50"
                  value={form.subtotal}
                  readOnly
                />
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="pt-4 border-t mt-2">
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button
            onClick={handleSalvar}
            disabled={salvando}
            style={{ background: "#3B5CCC" }}
            className="text-white min-w-[100px]"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}