import React from "react";
import { cn } from "@/lib/utils";

/**
 * ErpStatCard — Card de estatísticas do dashboard
 * 
 * Propriedades:
 * - label: Rótulo da estatística
 * - value: Valor numérico principal
 * - subtitle: Informação adicional
 * - icon: Ícone (Lucide)
 * - color: Cor da borda ("blue", "green", "yellow", "red")
 */
const colorStyles = {
  blue:   { border: "border-l-4", borderColor: "#3B82F6", iconBg: "#EFF6FF", iconColor: "#3B5CCC" },
  green:  { border: "border-l-4", borderColor: "#22C55E", iconBg: "#F0FDF4", iconColor: "#16A34A" },
  yellow: { border: "border-l-4", borderColor: "#F59E0B", iconBg: "#FFFBEB", iconColor: "#D97706" },
  red:    { border: "border-l-4", borderColor: "#EF4444", iconBg: "#FEF2F2", iconColor: "#DC2626" },
  slate:  { border: "border-l-4", borderColor: "#6B7280", iconBg: "#F9FAFB", iconColor: "#374151" },
};

export default function ErpStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color = "slate",
  className,
}) {
  const style = colorStyles[color] || colorStyles.slate;

  return (
    <div
      className={cn("bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow", style.border, className)}
      style={{ borderLeftColor: style.borderColor }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1.5" style={{ color: '#1F2937' }}>{value}</p>
          {subtitle && <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{subtitle}</p>}
        </div>
        {Icon && (
          <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: style.iconBg }}>
            <Icon className="h-5 w-5" style={{ color: style.iconColor }} />
          </div>
        )}
      </div>
    </div>
  );
}