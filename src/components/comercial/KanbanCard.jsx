import React from "react";
import { Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KanbanCard({ solicitacao, onClick }) {
  const getAlertColor = (alerta) => {
    if (alerta === "crítico") return "border-red-500 bg-red-50";
    if (alerta === "alerta") return "border-yellow-500 bg-yellow-50";
    return "border-slate-200 bg-white";
  };

  const getPersonalizacaoLabel = () => {
    if (solicitacao.tipo_personalizacao === "Personalização na manga") {
      return `Personalização na manga (${solicitacao.mangas_personalizadas})`;
    }
    return solicitacao.tipo_personalizacao;
  };

  const tempoDecorrido = () => {
    const criacao = new Date(solicitacao.created_date);
    const agora = new Date();
    const horas = Math.floor((agora - criacao) / (1000 * 60 * 60));
    if (horas < 1) return "Agora";
    if (horas === 1) return "1h";
    return `${horas}h`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all",
        getAlertColor(solicitacao.alerta_sla)
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {solicitacao.numero_solicitacao}
          </p>
          <p className="text-xs text-slate-500 mt-1">{solicitacao.cliente_nome}</p>
        </div>
        {solicitacao.alerta_sla !== "normal" && (
          <AlertCircle
            className={cn(
              "h-4 w-4 ml-2 mt-1",
              solicitacao.alerta_sla === "crítico" ? "text-red-600" : "text-yellow-600"
            )}
          />
        )}
      </div>

      <div className="space-y-2 mb-3">
        <div className="text-xs text-slate-600">
          <span className="font-medium">{solicitacao.modelo}</span> - {solicitacao.cor}
        </div>
        <div className="text-xs text-slate-600">
          Qtd: <span className="font-medium">{solicitacao.quantidade}</span>
        </div>
        {solicitacao.tipo_personalizacao !== "Nenhuma" && (
          <div className="text-xs text-slate-600">
            {getPersonalizacaoLabel()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="h-3 w-3" />
        <span>{tempoDecorrido()}</span>
      </div>
    </div>
  );
}