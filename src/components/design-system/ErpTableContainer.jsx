import React from "react";
import { cn } from "@/lib/utils";

export default function ErpTableContainer({ children, className }) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
}