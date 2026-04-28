import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const STEPS = [
  { key: "validate",  label: "Validar versão aprovada" },
  { key: "build",     label: "Gerar build do frontend" },
  { key: "package",   label: "Empacotar arquivos (index.html, assets/, css/, js/)" },
  { key: "prepare",   label: "Preparar pacote para /public_html/erp" },
  { key: "register",  label: "Registrar evento de deploy" },
  { key: "finalize",  label: "Atualizar status para deployed" },
];

export default function DeployLogModal({ open, steps, error, done }) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Executando Deploy…</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {STEPS.map((s) => {
            const state = steps[s.key];
            return (
              <div key={s.key} className="flex items-center gap-3">
                {state === "done" && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                {state === "running" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />}
                {state === "error" && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                {!state && <div className="h-5 w-5 rounded-full border-2 border-slate-200 shrink-0" />}
                <span className={`text-sm ${state === "done" ? "text-green-700" : state === "running" ? "text-blue-700 font-medium" : state === "error" ? "text-red-600" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        {done && !error && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium text-center">
            ✅ Deploy concluído com sucesso! erp.ciamonaro.com.br atualizado.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}