import React from "react";
import PageHeader from "@/components/admin/PageHeader";
import { cn } from "@/lib/utils";

export default function ErpPageLayout({ 
  title, 
  description, 
  children, 
  action,
  className 
}) {
  return (
    <div className={cn("space-y-8", className)}>
      <PageHeader 
        title={title} 
        description={description}
        action={action}
      />
      
      {children}
    </div>
  );
}