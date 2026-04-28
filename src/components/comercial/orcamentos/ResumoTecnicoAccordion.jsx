import { useState, useEffect, useRef } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { Loader2, Clock } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

function LinhaResumo({ label, valor, destaque = false }) {
  return (
    <div className={`flex justify-between items-center py-1 ${destaque ? "border-t border-slate-200 pt-2 mt-1" : ""}`}>
      <span className={`text-xs ${destaque ? "font-semibold text-slate-700" : "text-slate-500"}`}>{label}</span>
      <span className={`text-xs font-mono ${destaque ? "font-bold text-slate-900" : "text-slate-700"}`}>{valor}</span>
    </div>
  );
}

function arredondar(val) {
  if (val == null || isNaN(val)) return "—";
  return Math.round(Number(val)).toLocaleString("pt-BR");
}

export default function ResumoTecnicoAccordion({ empresaId, quantidade, somaCores, somaPosicoes }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [semDados, setSemDados] = useState(false);
  const [semDadosMsg, setSemDadosMsg] = useState("");
  const [coresManual, setCoresManual] = useState("");
  const [posicoesManual, setPosicoesManual] = useState("");
  const { showError } = useGlobalAlert();
  const debounceRef = useRef(null);
  const cacheRef = useRef({ key: null, resultado: null });

  useEffect(() => {
    if (somaCores != null && Number(somaCores) > 0) {
      setCoresManual(String(Number(somaCores)));
      // Invalida cache para forçar recálculo
      cacheRef.current = { key: null, resultado: null };
    }
  }, [somaCores]);

  useEffect(() => {
    if (somaPosicoes != null && Number(somaPosicoes) > 0) {
      setPosicoesManual(String(Number(somaPosicoes)));
      // Invalida cache para forçar recálculo
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
        setSemDados(true);
        setSemDadosMsg("Informe quantidade, cores e posições para calcular");
        setResultado(null);
        return;
      }

      const cacheKey = `${empresaId}-${qtd}-${cores}-${posicoes}`;
      if (cacheRef.current.key === cacheKey && cacheRef.current.resultado) {
        setResultado(cacheRef.current.resultado);
        setSemDados(false);
        return;
      }

      setLoading(true);
      setSemDados(false);
      setSemDadosMsg("");
      try {
        const { data: params } = await supabase.from("config_estamparia").select("*").eq("empresa_id", empresaId).maybeSingle();
        if (!params) {
          setSemDados(true);
          setSemDadosMsg("Parâmetros de estamparia não configurados. Acesse Configuração Extras → Parâmetros estamparia.");
          setResultado(null);
          cacheRef.current = { key: null, resultado: null };
          return;
        }
        const tp = qtd * cores * posicoes;
        const setups = Math.ceil(tp / (params.capacidade_setup || 1));
        const ti = tp * (params.tempo_impressao_un || 0);
        const ts = setups * (params.tempo_setup || 0);
        const nl = Math.ceil(tp / (params.limpezas_por_prints || 1));
        const tli = nl * (params.tempo_limpeza_impressao || 0);
        const tlf = params.tempo_limpeza_final || 0;
        const tte = ti + ts + tli + tlf;
        const resultado = { tp, setups, ti, ts, nl, tli, tlf, tte, jornada: params.jornada_referencia };
        setResultado(resultado);
        setSemDados(false);
        cacheRef.current = { key: cacheKey, resultado };
      } catch (err) {
        showError({ title: "Erro ao calcular", description: err.message });
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
              onChange={e => setCoresManual(e.target.value.replace(/\D/g, ""))}
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
              onChange={e => setPosicoesManual(e.target.value.replace(/\D/g, ""))}
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
        ) : semDados || !resultado ? (
          <p className="text-xs text-slate-400 text-center py-2">
            {semDadosMsg || "Informe quantidade, cores e posições para calcular"}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            <LinhaResumo label="TP - Total de prints"            valor={resultado.tp?.toLocaleString("pt-BR")} />
            <LinhaResumo label="Número de setups"                valor={arredondar(resultado.setups)} />
            <LinhaResumo label="TI - Tempo de impressão (min)"   valor={arredondar(resultado.ti)} />
            <LinhaResumo label="TS - Tempo de setup (min)"       valor={arredondar(resultado.ts)} />
            <LinhaResumo label="NL - Número de limpezas"         valor={arredondar(resultado.nl)} />
            <LinhaResumo label="TLI - Tempo limpeza impressão (min)" valor={arredondar(resultado.tli)} />
            <LinhaResumo label="TLF - Tempo limpeza final (min)" valor={arredondar(resultado.tlf)} />
            <LinhaResumo label="TTE - Tempo total estimado (min)" valor={arredondar(resultado.tte)} destaque />
            {resultado.jornada != null && (
              <div className="pt-2 mt-1">
                <p className="text-[10px] text-slate-400">
                  Jornada referência: {Math.round(resultado.jornada)} min
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}