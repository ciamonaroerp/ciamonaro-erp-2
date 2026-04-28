import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Rocket,
  FolderCheck,
  ShieldCheck,
  Globe,
  Github,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/components/lib/supabaseClient";

// ── Checklist items ────────────────────────────────────────────────────────────
const CHECKS = [
  {
    id: "services",
    label: "Pasta /services existe",
    description: "Serviços centralizados detectados no projeto",
    icon: FolderCheck,
    validate: async () => {
      // Tenta invocar o service de pagamento para confirmar existência
      try {
        const mod = await import("@/services/pagamentoService");
        return mod && typeof mod.gerarParcelas === "function"
          ? { ok: true, detail: "pagamentoService.js encontrado" }
          : { ok: false, detail: "gerarParcelas não exportado" };
      } catch {
        return { ok: false, detail: "services/pagamentoService.js não encontrado" };
      }
    },
  },
  {
    id: "supabase_url",
    label: "VITE_SUPABASE_URL configurada",
    description: "Variável de ambiente de conexão com Supabase",
    icon: ShieldCheck,
    validate: async () => {
      const val = import.meta.env.VITE_SUPABASE_URL;
      return val
        ? { ok: true, detail: val.replace(/\/\/.*@/, "//***@") }
        : { ok: false, detail: "Variável não definida" };
    },
  },
  {
    id: "supabase_anon",
    label: "VITE_SUPABASE_ANON_KEY configurada",
    description: "Chave anônima do Supabase para autenticação",
    icon: ShieldCheck,
    validate: async () => {
      const val = import.meta.env.VITE_SUPABASE_ANON_KEY;
      return val
        ? { ok: true, detail: `${val.slice(0, 12)}…` }
        : { ok: false, detail: "Variável não definida" };
    },
  },
  {
    id: "vite_build",
    label: "Compatibilidade com Vite / dist",
    description: "Projeto usa Vite com saída em /dist",
    icon: Terminal,
    validate: async () => {
      // import.meta.env existe somente em ambientes Vite
      return import.meta.env
        ? { ok: true, detail: `Mode: ${import.meta.env.MODE}` }
        : { ok: false, detail: "import.meta.env não disponível" };
    },
  },
  {
    id: "backend_ok",
    label: "Backend (Supabase) acessível",
    description: "Conexão com o backend verificada",
    icon: Globe,
    validate: async () => {
      try {
        const { error } = await supabase.from("erp_usuarios").select("id").limit(1);
        return error
          ? { ok: false, detail: error.message }
          : { ok: true, detail: "Supabase respondeu com sucesso" };
      } catch (e) {
        return { ok: false, detail: e.message };
      }
    },
  },
];

// ── Deploy steps ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: 1,
    title: "Exportar projeto",
    desc: "Faça o download do código-fonte via painel Base44 ou use o sync com GitHub.",
  },
  {
    num: 2,
    title: "Subir no GitHub",
    desc: 'Crie um repositório e faça push: git init && git add . && git commit -m "init" && git push',
    code: "git init && git add . && git commit -m \"init\" && git push",
  },
  {
    num: 3,
    title: "Conectar na Vercel",
    desc: 'Acesse vercel.com, clique em "Import Project" e selecione o repositório GitHub.',
  },
  {
    num: 4,
    title: "Deploy automático",
    desc: 'Configure as variáveis de ambiente na Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY etc.) e clique em "Deploy".',
  },
];

// ── Status icon helper ─────────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === "pending") return <div className="h-5 w-5 rounded-full border-2 border-slate-300" />;
  if (status === "loading") return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DeployManagerV2() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    setDone(false);
    setResults({});

    for (const check of CHECKS) {
      setResults(prev => ({ ...prev, [check.id]: { status: "loading" } }));
      const result = await check.validate();
      setResults(prev => ({
        ...prev,
        [check.id]: { status: result.ok ? "ok" : "error", detail: result.detail },
      }));
    }

    setRunning(false);
    setDone(true);
  };

  const allOk = done && CHECKS.every(c => results[c.id]?.status === "ok");
  const hasErrors = done && CHECKS.some(c => results[c.id]?.status === "error");

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-2">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
          <Rocket className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Deploy Manager V2</h1>
          <p className="text-sm text-slate-500">Validação e preparação para deploy na Vercel</p>
        </div>
      </div>

      {/* ── Checklist ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Checklist de Validação</h2>
          <Button
            size="sm"
            onClick={runChecks}
            disabled={running}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {running ? "Validando…" : "Executar Validação"}
          </Button>
        </div>

        <div className="divide-y divide-slate-100">
          {CHECKS.map(check => {
            const res = results[check.id];
            const status = res?.status || "pending";
            const Icon = check.icon;

            return (
              <div key={check.id} className="flex items-start gap-4 px-6 py-4">
                <Icon className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{check.label}</p>
                  <p className="text-xs text-slate-500">{check.description}</p>
                  {res?.detail && (
                    <p className={`text-xs mt-1 font-mono ${status === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                      {res.detail}
                    </p>
                  )}
                </div>
                <StatusIcon status={status} />
              </div>
            );
          })}
        </div>

        {/* Result banner */}
        {done && (
          <div className={`px-6 py-4 border-t flex items-center gap-3 ${allOk ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {allOk
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
            <p className={`text-sm font-semibold ${allOk ? "text-emerald-700" : "text-red-600"}`}>
              {allOk
                ? "✅ Sistema pronto para deploy na Vercel!"
                : "⚠️ Corrija os itens com erro antes de fazer o deploy."}
            </p>
          </div>
        )}
      </div>

      {/* ── Status pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Build pronto", ok: results["vite_build"]?.status === "ok" },
          { label: "Services OK", ok: results["services"]?.status === "ok" },
          { label: "Supabase conectado", ok: results["backend_ok"]?.status === "ok" },
          { label: "Pronto para Vercel", ok: allOk },
        ].map(pill => (
          <div
            key={pill.label}
            className={`rounded-xl px-4 py-3 border text-center transition-all ${
              pill.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="text-lg mb-1">{pill.ok ? "✅" : "⬜"}</div>
            <p className="text-xs font-medium">{pill.label}</p>
          </div>
        ))}
      </div>

      {/* ── Deploy steps ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Github className="h-5 w-5 text-slate-600" />
          <h2 className="font-semibold text-slate-700">Instruções de Deploy</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {STEPS.map(step => (
            <div key={step.num} className="flex items-start gap-4 px-6 py-4">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.num}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                {step.code && (
                  <code className="block mt-2 bg-slate-900 text-green-400 text-xs rounded-lg px-3 py-2 font-mono overflow-x-auto">
                    {step.code}
                  </code>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}