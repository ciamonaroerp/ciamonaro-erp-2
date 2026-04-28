import React from "react";
import { cn } from "@/lib/utils";

/**
 * ErpDashboardGrid — Grid padrão para dashboards
 * 
 * Propriedades:
 * - children: Elementos a serem exibidos no grid
 * - columns: Número de colunas (padrão: 4)
 * - gap: Espaçamento entre items (padrão: 24px)
 */
export default function ErpDashboardGrid({
  children,
  columns = 4,
  gap = "gap-6",
  className,
}) {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }[columns] || "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid", gridClass, gap, className)}>
      {children}
    </div>
  );
}