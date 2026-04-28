import React from "react";
import { cn } from "@/lib/utils";

/**
 * StatusBadge — Badge padrão do CIAMONARO ERP
 * 
 * Status suportados:
 * - "Aprovado" | "Ativo" | "Concluído" → Verde
 * - "Alerta" | "Análise" | "Ajustes" | "Em análise" → Amarelo
 * - "Reprovado" | "Inativo" | "Erro" → Vermelho
 * - "Pendente" | "Normal" → Cinza
 * - "Informação" → Ciano
 */
const statusStyles = {
  // Verde
  Aprovado: "bg-green-50 text-green-700 border-green-200",
  Ativo: "bg-green-50 text-green-700 border-green-200",
  Concluído: "bg-green-50 text-green-700 border-green-200",

  // Amarelo
  Alerta: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Análise: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Em análise": "bg-yellow-50 text-yellow-700 border-yellow-200",
  Ajustes: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Em Análise": "bg-yellow-50 text-yellow-700 border-yellow-200",

  // Vermelho
  Reprovado: "bg-red-50 text-red-700 border-red-200",
  Inativo: "bg-red-50 text-red-700 border-red-200",
  Erro: "bg-red-50 text-red-700 border-red-200",

  // Cinza
  Pendente: "bg-slate-50 text-slate-700 border-slate-200",
  Normal: "bg-slate-50 text-slate-700 border-slate-200",

  // Ciano
  Informação: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export default function StatusBadge({ status = "Normal", className }) {
  const style = statusStyles[status] || statusStyles.Normal;

  return (
    <span
      className={cn(
        "inline-block px-2.5 py-1 rounded-md text-xs font-medium border",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}