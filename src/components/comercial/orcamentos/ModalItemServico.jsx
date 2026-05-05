/**
 * Modal de Item — Tipo Serviço
 * Inclui Acabamentos, Tipo de Personalização e Itens Adicionais (mesma lógica do ModalItemProduto)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import ModalPersonalizacaoDependencias from "./ModalPersonalizacaoDependencias";

function fmtMoeda(v) {
  let n;
  if (typeof v === "number") {
    n = v;
  } else {
    n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0;
  }
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoeda(str) {
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}

// Modal para valor variável de item adicional
function ModalValorItemAdicional({ open, onClose, item, onSalvar }) {
  const [valor, setValor] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSalvar = () => {
    if (!valor || parseMoeda(valor) <= 0) {
      alert("Insira um valor válido maior que zero");
      return;
    }
    onSalvar(parseMoeda(valor));
    setValor("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Valor — {item?.descricao || item?.tipo_dependencia || "Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Informe o valor unitário para este item adicional.</p>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs text-slate-400 pointer-events-none">R$</span>
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSalvar()}
              placeholder="0,00"
              className="h-9 text-sm pl-8 text-right font-mono"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="text-xs h-8">Cancelar</Button>
          <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700 text-xs h-8">Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ModalItemServico({ open, onClose, onSalvar, empresaId, proximaSequencia, itemEdicao = null }) {
  const itemEdicaoIdRestoradoRef = useRef(null);

  const [form, setForm] = useState({
    sequencia: proximaSequencia || 1,
    quantidade: "",
    observacoes: "",
    valor_unitario: "",
    subtotal: "0,00",
    acabamentos: [],
    acabamentos_ids: [],
    personalizacoes: [],
    personalizacoes_ids: [],
    itens_adicionais: [],
    itens_adicionais_ids: [],
    operacoes: [],
  });

  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [loadingEdicao, setLoadingEdicao] = useState(false);

  // Personalizações
  const [personalizacoesSelecionadas, setPersonalizacoesSelecionadas] = useState({});
  const [modalPersAberto, setModalPersAberto] = useState(false);
  const [persEmEdicao, setPersEmEdicao] = useState(null);

  // Itens adicionais
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState([]);
  const [itensAdicionaisComValor, setItensAdicionaisComValor] = useState({});
  const [modalValorAberto, setModalValorAberto] = useState(false);
  const [itemAdicionalEmEdicao, setItemAdicionalEmEdicao] = useState(null);

  // Dados externos
  const { data: acabamentos = [] } = useQuery({
    queryKey: ["orcamento-acabamentos", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("config_acabamentos").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
    staleTime: 5 * 60_000,
  });

  const { data: personalizacoes = [] } = useQuery({
    queryKey: ["orcamento-personalizacoes-v2", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("config_personalizacao").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
    staleTime: 5 * 60_000,
  });

  const { data: itensAdicionais = [] } = useQuery({
    queryKey: ["orcamento-itens-adicionais", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("config_dependencias").select("*").eq("empresa_id", empresaId).is("deleted_at", null);
      return data || [];
    },
    enabled: !!empresaId,
    staleTime: 5 * 60_000,
  });

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      itemEdicaoIdRestoradoRef.current = null;
    }
  }, [open]);

  // Restauração dos dados ao editar
  useEffect(() => {
    if (!itemEdicao) {
      setPersonalizacoesSelecionadas({});
      setItensSelecionadosIds([]);
      setItensAdicionaisComValor({});
      setLoadingEdicao(false);
      itemEdicaoIdRestoradoRef.current = null;
      setForm(prev => ({
        ...prev,
        sequencia: proximaSequencia || 1,
        quantidade: "",
        observacoes: "",
        valor_unitario: "",
        subtotal: "0,00",
        acabamentos: [],
        acabamentos_ids: [],
        personalizacoes: [],
        personalizacoes_ids: [],
        itens_adicionais: [],
        itens_adicionais_ids: [],
        operacoes: [],
      }));
      return;
    }

    if (itemEdicaoIdRestoradoRef.current === itemEdicao.id) {
      setLoadingEdicao(false);
      return;
    }

    const temAcabSalvos = Array.isArray(itemEdicao.acabamentos) && itemEdicao.acabamentos.length > 0;
    const temAdicSalvos = Array.isArray(itemEdicao.itens_adicionais) && itemEdicao.itens_adicionais.length > 0;
    const temPersSalvos = Array.isArray(itemEdicao.personalizacoes) && itemEdicao.personalizacoes.length > 0;

    if (temAcabSalvos && acabamentos.length === 0) { setLoadingEdicao(true); return; }
    if (temAdicSalvos && itensAdicionais.length === 0) { setLoadingEdicao(true); return; }
    if (temPersSalvos && personalizacoes.length === 0) { setLoadingEdicao(true); return; }

    // --- Acabamentos ---
    const acabSalvos = Array.isArray(itemEdicao.acabamentos) ? itemEdicao.acabamentos : [];
    let idsAcab = [];
    let nomesAcab = [];
    if (acabSalvos.length > 0 && typeof acabSalvos[0] === "object" && acabSalvos[0]?.id) {
      acabSalvos.forEach(aSalvo => {
        const cfg = acabamentos.find(a => String(a.id) === String(aSalvo.id));
        const nome = cfg?.nome_acabamento || aSalvo.descricao || aSalvo.nome_acabamento;
        if (nome) { idsAcab.push(aSalvo.id); nomesAcab.push(nome); }
      });
    } else if (acabSalvos.length > 0 && typeof acabSalvos[0] === "string" && acabamentos.length > 0) {
      idsAcab = acabamentos.filter(a => acabSalvos.includes(a.nome_acabamento)).map(a => a.id);
      nomesAcab = idsAcab.map(id => acabamentos.find(a => a.id === id)?.nome_acabamento).filter(Boolean);
    }

    // --- Personalizações ---
    const persJsonb = Array.isArray(itemEdicao.personalizacoes)
      ? itemEdicao.personalizacoes
      : (typeof itemEdicao.personalizacoes === "string"
          ? (() => { try { return JSON.parse(itemEdicao.personalizacoes); } catch { return []; } })()
          : []);
    const novoMapaPers = {};
    const nomesRestaurados = [];
    const idsRestaurados = [];
    if (persJsonb.length > 0 && personalizacoes.length > 0) {
      persJsonb.forEach(pSalvo => {
        if (!pSalvo?.id) return;
        const cfg = personalizacoes.find(p => String(p.id) === String(pSalvo.id));
        if (!cfg) return;
        const dep = typeof cfg.dependencias_pers === "string"
          ? (() => { try { return JSON.parse(cfg.dependencias_pers); } catch { return {}; } })()
          : (cfg.dependencias_pers || {});
        novoMapaPers[cfg.id] = {
          cores: dep.usa_cores ? (pSalvo.cores ?? null) : null,
          posicoes: dep.usa_posicoes ? (pSalvo.posicoes ?? null) : null,
          valor_variavel: dep.usa_valor_variavel ? (pSalvo.valor_variavel ?? null) : null,
        };
        nomesRestaurados.push(cfg.tipo_personalizacao);
        idsRestaurados.push(cfg.id);
      });
    }
    setPersonalizacoesSelecionadas(novoMapaPers);

    // --- Itens adicionais ---
    const adicionaisSalvos = Array.isArray(itemEdicao.itens_adicionais) ? itemEdicao.itens_adicionais : [];
    const idsAdic = [];
    const valoresMapeados = {};
    if (adicionaisSalvos.length > 0 && itensAdicionais.length > 0) {
      const primeiro = adicionaisSalvos[0];
      if (typeof primeiro === "object" && primeiro?.id !== undefined) {
        adicionaisSalvos.forEach(itemSalvo => {
          const config = itensAdicionais.find(i => String(i.id) === String(itemSalvo.id));
          if (config) {
            idsAdic.push(String(config.id));
            valoresMapeados[config.id] = { valor: itemSalvo.valor, tipo: itemSalvo.tipo || "fixo" };
          }
        });
      } else if (typeof primeiro === "string") {
        adicionaisSalvos.forEach(nome => {
          const config = itensAdicionais.find(i => i.tipo_dependencia === nome);
          if (config) idsAdic.push(String(config.id));
        });
      }
    }
    setItensSelecionadosIds(idsAdic);
    setItensAdicionaisComValor(valoresMapeados);

    setForm({
      ...itemEdicao,
      quantidade: itemEdicao.quantidade != null ? String(itemEdicao.quantidade) : "",
      valor_unitario: fmtMoeda(itemEdicao.valor_unitario || 0),
      subtotal: fmtMoeda(itemEdicao.subtotal || 0),
      observacoes: itemEdicao.observacoes || "",
      acabamentos: nomesAcab,
      acabamentos_ids: idsAcab,
      personalizacoes: nomesRestaurados,
      personalizacoes_ids: idsRestaurados,
    });

    setLoadingEdicao(false);
    itemEdicaoIdRestoradoRef.current = itemEdicao.id;
  }, [itemEdicao, acabamentos, personalizacoes, itensAdicionais, proximaSequencia]);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const calcSubtotal = useCallback((qtd, vu) => {
    const q = parseInt(qtd) || 0;
    const v = parseMoeda(vu);
    return fmtMoeda(q * v);
  }, []);

  const handleQtd = (val) => {
    const qtd = val.replace(/\D/g, "").slice(0, 6);
    const sub = calcSubtotal(qtd, form.valor_unitario);
    setForm(prev => ({ ...prev, quantidade: qtd, subtotal: sub }));
  };

  const handleValorUnitario = (raw) => {
    const digits = raw.replace(/\D/g, "");
    const cents = parseInt(digits || "0", 10);
    const formatted = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sub = calcSubtotal(form.quantidade, formatted);
    setForm(prev => ({ ...prev, valor_unitario: formatted, subtotal: sub }));
  };

  // --- Acabamentos ---
  const toggleAcabamento = (id, nome) => {
    setForm(prev => {
      const nomes = prev.acabamentos || [];
      const ids = prev.acabamentos_ids || [];
      const jatem = nomes.includes(nome);
      return {
        ...prev,
        acabamentos: jatem ? nomes.filter(a => a !== nome) : [...nomes, nome],
        acabamentos_ids: jatem ? ids.filter(a => a !== id) : [...ids, id],
      };
    });
  };

  // --- Personalizações ---
  const togglePersonalizacao = (cfgItem) => {
    const id = cfgItem.id;
    const nome = cfgItem.tipo_personalizacao;
    const dep = cfgItem.dependencias_pers || {};
    const jatem = (form.personalizacoes_ids || []).map(String).includes(String(id));

    if (jatem) {
      setForm(prev => ({
        ...prev,
        personalizacoes: (prev.personalizacoes || []).filter(n => n !== nome),
        personalizacoes_ids: (prev.personalizacoes_ids || []).filter(i => String(i) !== String(id)),
      }));
      setPersonalizacoesSelecionadas(prev => {
        const novo = { ...prev };
        delete novo[id];
        return novo;
      });
    } else {
      const temDep = dep.usa_cores || dep.usa_posicoes || dep.usa_valor_variavel;
      if (temDep) {
        setPersEmEdicao(cfgItem);
        setModalPersAberto(true);
      } else {
        setForm(prev => ({
          ...prev,
          personalizacoes: [...(prev.personalizacoes || []), nome],
          personalizacoes_ids: [...(prev.personalizacoes_ids || []), id],
        }));
        setPersonalizacoesSelecionadas(prev => ({ ...prev, [id]: {} }));
      }
    }
  };

  const handleConfirmarPersonalizacao = (inputs) => {
    const cfg = persEmEdicao;
    if (!cfg) return;
    setForm(prev => ({
      ...prev,
      personalizacoes: [...(prev.personalizacoes || []), cfg.tipo_personalizacao],
      personalizacoes_ids: [...(prev.personalizacoes_ids || []), cfg.id],
    }));
    setPersonalizacoesSelecionadas(prev => ({ ...prev, [cfg.id]: inputs }));
    setModalPersAberto(false);
    setPersEmEdicao(null);
  };

  // --- Itens Adicionais ---
  const toggleItemAdicional = (id, nome, item) => {
    const idString = String(id);
    const jatem = itensSelecionadosIds.includes(idString);
    if (jatem) {
      setItensSelecionadosIds(prev => prev.filter(x => x !== idString));
      setForm(prev => ({
        ...prev,
        itens_adicionais: (prev.itens_adicionais || []).filter(n => n !== nome),
        itens_adicionais_ids: (prev.itens_adicionais_ids || []).filter(i => String(i) !== idString),
      }));
      setItensAdicionaisComValor(prev => {
        const novo = { ...prev };
        delete novo[id];
        return novo;
      });
    } else {
      if (item?.tipo_valor === false) {
        setItemAdicionalEmEdicao({ id, nome, ...item });
        setModalValorAberto(true);
      } else {
        setItensSelecionadosIds(prev => [...prev, idString]);
        setForm(prev => ({
          ...prev,
          itens_adicionais: [...(prev.itens_adicionais || []), nome],
          itens_adicionais_ids: [...(prev.itens_adicionais_ids || []), id],
        }));
        if (item?.valor_un_adic != null) {
          setItensAdicionaisComValor(prev => ({ ...prev, [id]: { valor: item.valor_un_adic, tipo: "fixo" } }));
        }
      }
    }
  };

  const handleConfirmarValorAdicional = (valorDigitado) => {
    if (!itemAdicionalEmEdicao) return;
    const idString = String(itemAdicionalEmEdicao.id);
    setItensSelecionadosIds(prev => prev.includes(idString) ? prev : [...prev, idString]);
    setForm(prev => ({
      ...prev,
      itens_adicionais: [...(prev.itens_adicionais || []), itemAdicionalEmEdicao.nome],
      itens_adicionais_ids: [...(prev.itens_adicionais_ids || []), itemAdicionalEmEdicao.id],
    }));
    setItensAdicionaisComValor(prev => ({ ...prev, [itemAdicionalEmEdicao.id]: { valor: valorDigitado, tipo: "variavel" } }));
    setModalValorAberto(false);
    setItemAdicionalEmEdicao(null);
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

      const itensAdicionaisJsonb = itensSelecionadosIds.map(idStr => {
        const itemConfig = itensAdicionais.find(i => String(i.id) === idStr);
        if (!itemConfig) return null;
        const itemComValor = itensAdicionaisComValor[itemConfig.id];
        return {
          id: itemConfig.id,
          descricao: itemConfig.tipo_dependencia,
          valor: itemComValor?.valor ?? itemConfig.valor_un_adic ?? 0,
          tipo: itemComValor?.tipo || (itemConfig.tipo_valor ? "fixo" : "variavel"),
        };
      }).filter(Boolean);

      // Captura usuario_id do usuário logado
      let usuario_id = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: erpUser } = await supabase.from("erp_usuarios").select("id").eq("email", user.email).maybeSingle();
          usuario_id = erpUser?.id || null;
        }
      } catch { /* ignora erro — salva sem usuario_id */ }

      const payload = {
        sequencia: parseInt(form.sequencia),
        tipo_item: "Serviço",
        usuario_id,
        quantidade,
        observacoes: form.observacoes || null,
        valor_unitario: valorUnitario,
        subtotal: valorUnitario * quantidade,
        produto_percentual: 0,
        servico_percentual: 100,
        acabamentos: (form.acabamentos_ids || []).map(id => {
          const cfg = acabamentos.find(a => String(a.id) === String(id));
          return cfg ? { id: cfg.id, descricao: cfg.nome_acabamento } : { id };
        }),
        acabamentos_ids: form.acabamentos_ids || [],
        personalizacoes: (form.personalizacoes_ids || []).map(id => {
          const cfg = personalizacoes.find(p => String(p.id) === String(id));
          const inputs = personalizacoesSelecionadas[id] || {};
          return {
            id,
            descricao: cfg?.tipo_personalizacao || "",
            cores: inputs.cores ?? null,
            posicoes: inputs.posicoes ?? null,
            valor_variavel: inputs.valor_variavel ?? null,
          };
        }),
        personalizacoes_ids: form.personalizacoes_ids || [],
        itens_adicionais: itensAdicionaisJsonb,
        itens_adicionais_ids: form.itens_adicionais_ids || [],
        operacoes: form.operacoes || [],
      };

      await onSalvar(payload, itemEdicao?.id);
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {itemEdicao ? "Editar Item —" : "Novo Item —"} Serviço
            </DialogTitle>
          </DialogHeader>

          {loadingEdicao ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              <p className="text-sm text-slate-500">Carregando dados do item...</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">

              {/* Quantidade + Descrição */}
              <div className="flex items-start gap-3">
                <div className="space-y-1 w-[100px] shrink-0">
                  <Label className="text-xs font-medium text-slate-600">Qtd *</Label>
                  <Input
                    value={form.quantidade}
                    onChange={e => handleQtd(e.target.value)}
                    className={`h-9 text-sm text-center font-mono ${erros.quantidade ? "border-red-400" : ""}`}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="off"
                  />
                  {erros.quantidade && <p className="text-xs text-red-500">{erros.quantidade}</p>}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <Label className="text-xs font-medium text-slate-600">Descrição do Serviço</Label>
                  <textarea
                    value={form.observacoes}
                    onChange={e => setField("observacoes", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Descreva o serviço..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Acabamentos */}
              {acabamentos.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Acabamentos</Label>
                  <div className="flex flex-wrap gap-2">
                    {acabamentos.map(a => {
                      const sel = (form.acabamentos || []).includes(a.nome_acabamento);
                      return (
                        <button key={a.id} type="button"
                          onClick={() => toggleAcabamento(a.id, a.nome_acabamento)}
                          className={`px-3 py-1 rounded-md text-sm font-medium border transition-all ${
                            sel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {a.nome_acabamento}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personalizações */}
              {personalizacoes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo de Personalização</Label>
                  <div className="flex flex-wrap gap-2">
                    {personalizacoes.map(p => {
                      const sel = (form.personalizacoes_ids || []).map(String).includes(String(p.id));
                      const inputs = personalizacoesSelecionadas[p.id];
                      const dep = p.dependencias_pers || {};
                      const infoExtra = sel && inputs
                        ? [
                            dep.usa_cores && inputs.cores != null ? `${inputs.cores}cor` : null,
                            dep.usa_posicoes && inputs.posicoes != null ? `${inputs.posicoes}pos` : null,
                            dep.usa_valor_variavel && inputs.valor_variavel != null
                              ? `R$${Number(inputs.valor_variavel).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null,
                          ].filter(Boolean).join(" · ")
                        : null;
                      return (
                        <button key={p.id} type="button"
                          onClick={() => togglePersonalizacao(p)}
                          className={`px-3 py-1 rounded-md text-sm font-medium border transition-all flex items-center gap-1 ${
                            sel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {p.tipo_personalizacao}
                          {infoExtra && <span className="opacity-70 font-normal text-xs">({infoExtra})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Itens Adicionais */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Itens Adicionais</Label>
                <div className="flex flex-wrap gap-2">
                  {itensAdicionais.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum item adicional cadastrado</p>
                  ) : (
                    itensAdicionais.map(item => {
                      const idString = String(item.id);
                      const sel = itensSelecionadosIds.includes(idString);
                      return (
                        <button key={item.id} type="button"
                          onClick={() => toggleItemAdicional(item.id, item.tipo_dependencia, item)}
                          className={`px-3 py-1 rounded-md text-sm font-medium border transition-all ${
                            sel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {item.tipo_dependencia}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Valores */}
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
          )}

          {!loadingEdicao && (
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
          )}
        </DialogContent>
      </Dialog>

      <ModalValorItemAdicional
        open={modalValorAberto}
        onClose={() => { setModalValorAberto(false); setItemAdicionalEmEdicao(null); }}
        item={itemAdicionalEmEdicao}
        onSalvar={handleConfirmarValorAdicional}
      />

      <ModalPersonalizacaoDependencias
        open={modalPersAberto}
        onClose={() => { setModalPersAberto(false); setPersEmEdicao(null); }}
        personalizacao={persEmEdicao}
        valoresSalvos={persEmEdicao ? personalizacoesSelecionadas[persEmEdicao.id] : null}
        onConfirmar={handleConfirmarPersonalizacao}
      />
    </>
  );
}