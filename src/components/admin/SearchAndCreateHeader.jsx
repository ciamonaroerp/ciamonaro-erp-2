import React from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchAndCreateHeader({ 
  searchValue, 
  onSearchChange, 
  onCreateClick,
  placeholder = "Buscar...",
  createButtonLabel = "Novo",
  hideCreateButton = false
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 rounded-lg"
        />
      </div>
      {!hideCreateButton && (
        <Button
          onClick={onCreateClick}
          size="sm"
          style={{ background: '#3B5CCC' }}
          className="text-white gap-2 shrink-0 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          {createButtonLabel}
        </Button>
      )}
    </div>
  );
}