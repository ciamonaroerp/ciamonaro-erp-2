import React from "react";
import { cn } from "@/lib/utils";

/**
 * ErpCard — Card padrão do CIAMONARO ERP
 * 
 * Propriedades:
 * - title: Título principal
 * - subtitle: Subtítulo (opcional)
 * - status: Status visual (opcional)
 * - time: Tempo decorrido (opcional)
 * - onClick: Callback ao clicar (opcional)
 * - children: Conteúdo do card
 */
export default function ErpCard({
  title,
  subtitle,
  status,
  time,
  onClick,
  className,
  children,
  isDragging = false,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border p-4 shadow-sm",
        "hover:shadow-md transition-all duration-150",
        onClick ? "cursor-pointer group" : "",
        isDragging ? "opacity-50 shadow-lg" : "border-slate-200 hover:border-slate-300",
        className
      )}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-sm line-clamp-2 transition-colors" style={{ color: '#1F2937' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{subtitle}</p>
        )}
      </div>

      {/* Content */}
      {children && <div className="mb-3 text-sm text-slate-600">{children}</div>}

      {/* Footer com Status e Tempo */}
      {(status || time) && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {status && <div className="flex-1">{status}</div>}
          {time && (
            <div className="text-xs text-slate-500 font-medium ml-2">
              ⏱ {time}
            </div>
          )}
        </div>
      )}
    </div>
  );
}