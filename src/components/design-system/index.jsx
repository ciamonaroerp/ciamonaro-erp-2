/**
 * CIAMONARO ERP — Design System Components
 * 
 * Componentes reutilizáveis para todos os módulos do sistema.
 */

export { default as ErpCard } from "./ErpCard";
export { default as StatusBadge } from "./StatusBadge";
export { default as TimerBadge } from "./TimerBadge";
export { default as ErpDashboardGrid } from "./ErpDashboardGrid";
export { default as ErpStatCard } from "./ErpStatCard";
export { default as ErpHeader } from "./ErpHeader";
export { default as ErpPageLayout } from "./ErpPageLayout";
export { default as ErpTableContainer } from "./ErpTableContainer";
export { default as ErpCardGrid } from "./ErpCardGrid";
export { default as ErpInfoBox } from "./ErpInfoBox";

/**
 * Uso:
 * 
 * import { ErpCard, StatusBadge, TimerBadge, ErpStatCard } from "@/components/design-system";
 * 
 * export default function MyModule() {
 *   return (
 *     <ErpCard title="Exemplo" subtitle="Subtítulo">
 *       <StatusBadge status="Análise" />
 *       <TimerBadge createdAt={new Date()} />
 *     </ErpCard>
 *   );
 * }
 */