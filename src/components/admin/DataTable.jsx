import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ToggleLeft, ToggleRight, Trash2, Send, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DataTable({ columns, data, isLoading, onEdit, onToggleStatus, onDelete, onReenviarConvite, onResetarSenha }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              {columns.map(col => (
                <TableHead key={col.key} className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-4 px-6">
                  {col.label}
                </TableHead>
              ))}
              {(onEdit || onToggleStatus || onDelete || onReenviarConvite || onResetarSenha) && (
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-4 px-6 text-right">
                  Ações
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-12 text-slate-400">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={row.id || idx} className="hover:bg-slate-50/50 transition-colors">
                  {columns.map(col => (
                    <TableCell key={col.key} className="py-4 px-6">
                      {col.render ? col.render(row[col.key], row) : (
                        col.key === "status" ? (
                          <Badge className={cn(
                           "font-medium text-xs px-2.5 py-0.5 rounded-full",
                           row[col.key] === "Ativo" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                           row[col.key] === "Enviado" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                           row[col.key] === "Preparado" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                           row[col.key] === "Inativo" ? "bg-red-50 text-red-700 border border-red-200" :
                           "bg-slate-100 text-slate-600 border border-slate-200"
                          )}>
                           {row[col.key]}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-700">{row[col.key]}</span>
                        )
                      )}
                    </TableCell>
                  ))}
                  {(onEdit || onToggleStatus || onDelete || onReenviarConvite || onResetarSenha) && (
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => onEdit(row)} className="h-8 w-8 text-slate-400 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onReenviarConvite && (
                          <Button variant="ghost" size="icon" title="Reenviar convite" onClick={() => onReenviarConvite(row)} className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {onResetarSenha && (
                          <Button variant="ghost" size="icon" title="Resetar senha" onClick={() => onResetarSenha(row)} className="h-8 w-8 text-slate-400 hover:text-orange-600">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        {onToggleStatus && (
                          <Button variant="ghost" size="icon" title={row.status === "Ativo" ? "Inativar" : "Ativar"} onClick={() => onToggleStatus(row)} className="h-8 w-8 text-slate-400 hover:text-amber-600">
                            {row.status === "Ativo" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => onDelete(row)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}