import React from "react";

const colorMap = {
  blue:    { border: "#3B82F6", iconBg: "#EFF6FF", iconColor: "#3B5CCC" },
  emerald: { border: "#22C55E", iconBg: "#F0FDF4", iconColor: "#16A34A" },
  green:   { border: "#22C55E", iconBg: "#F0FDF4", iconColor: "#16A34A" },
  violet:  { border: "#8B5CF6", iconBg: "#F5F3FF", iconColor: "#7C3AED" },
  amber:   { border: "#F59E0B", iconBg: "#FFFBEB", iconColor: "#D97706" },
  rose:    { border: "#EF4444", iconBg: "#FEF2F2", iconColor: "#DC2626" },
  cyan:    { border: "#06B6D4", iconBg: "#ECFEFF", iconColor: "#0891B2" },
  slate:   { border: "#6B7280", iconBg: "#F9FAFB", iconColor: "#374151" },
};

export default function StatCard({ title, value, icon: Icon, color = "slate", subtitle }) {
  const style = colorMap[color] || colorMap.slate;

  return (
    <div
      className="bg-white rounded-xl border border-l-4 border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeftColor: style.border }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{title}</p>
          <p className="text-2xl font-bold mt-1.5" style={{ color: '#1F2937' }}>{value}</p>
          {subtitle && <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{subtitle}</p>}
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