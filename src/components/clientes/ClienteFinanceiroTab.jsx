import React from "react";
import { Lock } from "lucide-react";

function ReadField({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[36px]">
        {value || <span className="text-slate-400 italic">Sem informação</span>}
      </p>
    </div>
  );
}

function LimiteCard({ label, value, color }) {
  const colors = {
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    green: "border-green-200 bg-green-50",
  };
  return (
    <div className={`p-3 border rounded-lg ${colors[color] || colors.blue}`}>
      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800">
        {value != null && value !== "" ? `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
      </p>
    </div>
  );
}

export default function ClienteFinanceiroTab({ cliente }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700">
          Esses campos são somente leitura e serão alimentados pelo módulo Financeiro.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ReadField label="Status de crédito" value={cliente?.status_credito} />
        <ReadField label="Risco de crédito" value={cliente?.risco_credito} />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Limite de Crédito</p>
        <div className="grid grid-cols-3 gap-3">
          <LimiteCard label="Total" value={cliente?.limite_credito_total} color="blue" />
          <LimiteCard label="Utilizado" value={cliente?.limite_credito_utilizado} color="amber" />
          <LimiteCard label="Disponível" value={cliente?.limite_credito_disponivel} color="green" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ReadField label="Histórico de inadimplência" value={cliente?.historico_inadimplencia} />
        <ReadField label="Pontualidade de pagamento" value={cliente?.pontualidade_pagamento} />
      </div>

      <ReadField label="Condições de pagamento autorizadas" value={cliente?.condicoes_pagamento} />

      <div className="grid grid-cols-2 gap-4">
        <ReadField label="Última revisão de crédito" value={cliente?.ultima_revisao_credito} />
        <ReadField label="Próxima revisão de crédito" value={cliente?.proxima_revisao_credito} />
      </div>
    </div>
  );
}