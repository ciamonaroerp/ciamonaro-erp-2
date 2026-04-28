import React from "react";
import { cn } from "@/lib/utils";

export default function ErpCardGrid({ 
  children, 
  cols = 4,
  className 
}) {
  const gridClasses = {
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    2: "grid-cols-1 lg:grid-cols-2",
  };

  return (
    <div className={cn(
      "grid gap-5",
      gridClasses[cols] || gridClasses[4],
      className
    )}>
      {children}
    </div>
  );
}