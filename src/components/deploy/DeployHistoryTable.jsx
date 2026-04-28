import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import DeployStatusBadge from "./DeployStatusBadge";

export default function DeployHistoryTable({ versions, onRollback, isRollingBack }) {
  if (!versions?.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        Nenhuma versão registrada ainda.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Versão</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Ambiente</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Criado em</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Deploy em</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Usuário</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Observações</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-mono font-semibold text-slate-800">{v.version}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  v.environment === "production" ? "bg-blue-100 text-blue-700" :
                  v.environment === "staging" ? "bg-yellow-100 text-yellow-700" :
                  "bg-slate-100 text-slate-600"
                }`}>{v.environment}</span>
              </td>
              <td className="px-4 py-3"><DeployStatusBadge status={v.status} /></td>
              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                {v.created_date ? format(new Date(v.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                {v.date_deployed ? format(new Date(v.date_deployed), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs">{v.deployed_by || "—"}</td>
              <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">{v.notes || "—"}</td>
              <td className="px-4 py-3">
                {v.status === "deployed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={() => onRollback(v)}
                    disabled={isRollingBack}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Rollback
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}