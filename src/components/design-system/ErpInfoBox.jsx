import React from "react";
import { cn } from "@/lib/utils";

export default function ErpInfoBox({ 
  title,
  description,
  icon: Icon,
  children,
  className 
}) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 p-6 shadow-sm",
      className
    )}>
      {title && (
        <div className="flex items-center gap-2 mb-5">
          {Icon && <Icon className="h-5 w-5" style={{ color: '#3B5CCC' }} />}
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      
      {description && (
        <p className="text-sm text-slate-600 mb-4">{description}</p>
      )}
      
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}