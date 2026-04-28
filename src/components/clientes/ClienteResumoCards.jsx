import React from "react";
import { ShoppingCart, Package, TrendingUp, XCircle, CheckCircle2 } from "lucide-react";

function MiniCard({ label, value, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    red: "bg-red-50 border-red-200 text-red-800",
    green: "bg-green-50 border-green-200 text-green-800",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${colors[color]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

export default function ClienteResumoCards({ cliente, pedidos = [] }) {
  const ativos = pedidos.filter(p => p.status !== "Cancelado");
  const cancelados = pedidos.filter(p => p.status === "Cancelado");
  const totalCompras = ativos.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
  const ticketMedio = ativos.length > 0 ? totalCompras / ativos.length : 0;

  let recorrencia = "-";
  if (ativos.length >= 2) {
    const sorted = [...ativos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let totalDias = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalDias += (new Date(sorted[i].created_at) - new Date(sorted[i - 1].created_at)) / 86400000;
    }
    recorrencia = Math.round(totalDias / (sorted.length - 1)) + " dias";
  }

  const statusColor = { Ativo: "green", Inativo: "slate", Bloqueado: "red" }[cliente?.status] || "slate";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
      <MiniCard label="Volume de compras" value={`R$ ${totalCompras.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} color="blue" />
      <MiniCard label="Qtd. pedidos" value={ativos.length} color="blue" />
      <MiniCard label="Ticket médio" value={`R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} color="amber" />
      <MiniCard label="Recorrência média" value={recorrencia} color="amber" />
      <MiniCard label="Cancelados" value={cancelados.length} color={cancelados.length > 0 ? "red" : "slate"} />
    </div>
  );
}