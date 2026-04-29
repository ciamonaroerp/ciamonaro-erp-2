import { useState, useEffect, useRef } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { Loader2, Clock } from "lucide-react";

function LinhaResumo({ label, valor, destaque = false }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${destaque ? "border-t border-slate-200 pt-2 mt-1" : ""}`}>
      <span className={`text-xs ${destaque ? "font-semibold text-slate-700" : "text-slate-500"}`}>{label}</span>
      <span className={`text-xs font-mono ${destaque ? "font-bold text-slate-900" : "text-slate-700"}`}>{valor}</span>
    </div>
  );
}

function fmt(val) {
  if (val == null || isNaN(val)) return "—";
  return Number(val).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

const REQUIRED = ['PRM01', 'PRM02', 'PRM03', 'PRM04', 'PRM05', 'PRM06', 'PRM07', 'PRM08'];

export default function ResumoTecnicoAccordion({ empresaId, quantidade, somaCores, somaPosicoes }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [coresManual, setCoresManual] = useState("");
  const [posicoesManual, setPosicoesManual] = useState("");
  const debounceRef = useRef(null);
  const cacheRef = useRef({ key: null, resultado: null });

  useEffect(() => {
    if (somaCores != null && Number(somaCores) > 0) {
      setCoresManual(String(Number(somaCores)));
      cacheRef.current = { key: null, resultado: null };
    }
  }, [somaCores]);

  useEffect(() => {
    if (somaPosicoes != null && Number(somaPosicoes) > 0) {
      setPosicoesManual(String(Number(somaPosicoes)));
      cacheRef.current = { key: null, resultado: null };
    }
  }, [somaPosicoes]);

  useEffect(() => {
    calcular();
  }, [quantidade, coresManual, posicoesManual, empresaId]);

  const calcular = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const qtd = Number(quantidade) || 0;
      const cores = Number(coresManual) || 0;
      const posicoes = Number(posicoesManual) || 0;

      if (qtd <= 0 || cores <= 0 || posicoes <= 0) {
        setMensagem("Informe quantidade, cores e posições para calcular");
        setResultado(null);
        return;
      }

      const cacheKey = `${empresaId}-${qtd}-${cores}-${posicoes}`;
      if (cacheRef.current.key === cacheKey && cacheRef.current.resultado) {
        setResultado(cacheRef.current.resultado);
        setMensagem("");
        return;
      }

      setLoading(true);
      setMensagem("");
      try {
        const { data: params, error } = await supabase
          .from("config_estamparia")
          .select("codigo, unidade, tempo, valor")
          .in("codigo", REQUIRED)
          .eq("empresa_id", empresaId)
          .is("deleted_at", null);

        if (error) throw new Error(error.message);

        const faltando = REQUIRED.filter(code => !(params || []).find(p => p.codigo === code));
        if (faltando.length > 0) {
          setMensagem(`Parâmetros não configurados: ${faltando.join(", ")}. Acesse Configuração Extras → Parâmetros estamparia.`);
          setResultado(null);
          cacheRef.current = { key: null, resultado: null };
          return;
        }

        const get = (codigo) => (params || []).find(p => p.codigo === codigo);

        // PRM01: média de prints por camiseta (unidade)
        const prm01 = Number(get('PRM01').unidade) || 1;
        // PRM02: prints/hora; PRM03: máquinas
        const prints_hora = Number(get('PRM02').unidade) || 0;
        const maquinas = Number(get('PRM03').unidade) || 0;

        if (prints_hora <= 0 || maquinas <= 0) {
          setMensagem("PRM02 (prints/hora) e PRM03 (máquinas) devem ser maiores que zero.");
          setResultado(null);
          return;
        }

        // PRM04–PRM08: lidos da coluna "tempo" em minutos
        const intervalo_limpeza = Number(get('PRM04').tempo) || 0;
        const limpeza_impressao = Number(get('PRM05').tempo) || 0;
        const limpeza_final     = Number(get('PRM06').tempo) || 0;
        const setup_por_cor     = Number(get('PRM07').tempo) || 0;
        const jornada           = Number(get('PRM08').tempo) || 0;

        if (jornada <= 0) {
          setMensagem("PRM08 (jornada) deve ser maior que zero.");
          setResultado(null);
          return;
        }

        // ── Cálculos (mesma lógica do backend calcularTempoProducao) ──
        const tp = qtd * posicoes * prm01;
        const ti = (tp / (prints_hora * maquinas)) * 60;
        const setups = ti < jornada ? cores : Math.ceil(ti / jornada) * cores;
        const ts = setups * setup_por_cor;
        const nl = (intervalo_limpeza > 0 && ti >= intervalo_limpeza)
          ? Math.ceil(ti / intervalo_limpeza) * cores
          : 0;
        const tli = nl * limpeza_impressao * cores;
        const tlf = limpeza_final * setups;
        const tte = ti + ts + tli + tlf;

        const res = { tp, setups, ti, ts, nl, tli, tlf, tte, jornada };
        setResultado(res);
        setMensagem("");
        cacheRef.current = { key: cacheKey, resultado: res };
      } catch (err) {
        setMensagem("Erro ao calcular: " + (err?.message || "tente novamente."));
        setResultado(null);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resumo técnico de produção</span>
      </div>

      <div className="px-3 pb-3 pt-2 bg-white space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Cores</label>
            <input
              type="text"
              inputMode="numeric"
              value={coresManual}
              onChange={e => { setCoresManual(e.target.value.replace(/\D/g, "")); cacheRef.current = { key: null, resultado: null }; }}
              placeholder="Ex: 2"
              className="w-full h-8 border border-slate-200 rounded-md px-2 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Posições</label>
            <input
              type="text"
              inputMode="numeric"
              value={posicoesManual}
              onChange={e => { setPosicoesManual(e.target.value.replace(/\D/g, "")); cacheRef.current = { key: null, resultado: null }; }}
              placeholder="Ex: 1"
              className="w-full h-8 border border-slate-200 rounded-md px-2 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {loading ? (
          <div className="flex items-center gap-2 py-3 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="text-xs text-slate-400">Calculando...</span>
          </div>
        ) : mensagem ? (
          <p className="text-xs text-slate-400 text-center py-2">{mensagem}</p>
        ) : resultado ? (
          <div className="divide-y divide-slate-100">
            <LinhaResumo label="TP — Total de prints"                valor={fmt(resultado.tp)} />
            <LinhaResumo label="TI — Tempo de impressão (min)"       valor={fmt(resultado.ti)} />
            <LinhaResumo label="Nº de setups"                        valor={fmt(resultado.setups)} />
            <LinhaResumo label="TS — Tempo de setup (min)"           valor={fmt(resultado.ts)} />
            <LinhaResumo label="NL — Nº de limpezas"                 valor={fmt(resultado.nl)} />
            <LinhaResumo label="TLI — Tempo limpeza impressão (min)" valor={fmt(resultado.tli)} />
            <LinhaResumo label="TLF — Tempo limpeza final (min)"     valor={fmt(resultado.tlf)} />
            <LinhaResumo label="TTE — Tempo total estimado (min)"    valor={fmt(resultado.tte)} destaque />
            {resultado.jornada != null && (
              <div className="pt-2">
                <p className="text-[10px] text-slate-400">Jornada de referência: {Math.round(resultado.jornada)} min</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}