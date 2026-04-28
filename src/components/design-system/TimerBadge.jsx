import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * TimerBadge — Contador de tempo decorrido
 * 
 * Retorna status visual baseado no tempo:
 * - Até 4h: Normal (cinza)
 * - 4-24h: Alerta (amarelo)
 * - 24h+: Crítico (vermelho)
 */
function calculateElapsed(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalHours: hours + minutes / 60 };
}

function getStatusColor(totalHours) {
  if (totalHours >= 24) return "bg-red-50 text-red-700 border-red-200";
  if (totalHours >= 4) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function TimerBadge({ createdAt, className }) {
  const [time, setTime] = useState(() => calculateElapsed(createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(calculateElapsed(createdAt));
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [createdAt]);

  const { hours, minutes, totalHours } = time;
  const statusColor = getStatusColor(totalHours);

  return (
    <span className={cn("inline-block px-2.5 py-1 rounded-md text-xs font-medium border", statusColor, className)}>
      ⏱ {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
    </span>
  );
}