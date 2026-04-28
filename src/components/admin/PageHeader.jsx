import React from "react";

export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: '#1F2937' }}>{title}</h1>
        {description && <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}