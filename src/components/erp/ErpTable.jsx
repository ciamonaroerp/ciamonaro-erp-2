/**
 * CIAMONARO ERP — Tabela genérica para todos os módulos ERP.
 * Suporta colunas customizáveis, edição, exclusão e busca.
 */
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  "Ativo": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "ativo": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Inativo": "bg-red-50 text-red-700 border-red-200",
  "inativo": "bg-red-50 text-red-700 border-red-200",
  "planejado": "bg-blue-50 text-blue-700 border-blue-200",
  "em_producao": "bg-amber-50 text-amber-700 border-amber-200",
  "finalizado": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pendente": "bg-slate-100 text-slate-600 border-slate-200",
  "Enviado": "bg-blue-50 text-blue-700 border-blue-200",
  "Pago": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Vencido": "bg-red-50 text-red-700 border-red-200",
};

export default function ErpTable({
  titulo,
  colunas,
  dados = [],
  isLoading = false,
  onNovo,
  onEditar,
  onDeletar,
  campoBusca = "nome",
  acoes = [],
  showSearchBar = true,
}) {
  const [busca, setBusca] = useState("");

  const dadosFiltrados = dados.filter(row => {
    const valor = row[campoBusca] || "";
    return valor.toString().toLowerCase().includes(busca.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca - apenas se showSearchBar for true */}
      {showSearchBar && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 rounded-lg"
              placeholder="Buscar..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          {onNovo && (
            <Button onClick={onNovo} size="sm" className="gap-2 text-white shrink-0 rounded-lg" style={{ background: '#3B5CCC' }}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          )}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow style={{ background: '#F5F7FB' }}>
              {colunas.map(col => (
                <TableHead key={col.key} className="text-[11px] font-semibold uppercase tracking-wider py-3 px-5" style={{ color: '#6B7280' }}>
                  {col.label}
                </TableHead>
              ))}
              {(onEditar || onDeletar || acoes.length > 0) && (
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-5 text-right">
                  Ações
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colunas.length + 1} className="text-center py-12 text-slate-400 text-sm">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              dadosFiltrados.map((row, idx) => (
                <TableRow key={row.id || idx} className="hover:bg-slate-50/50 transition-colors">
                  {colunas.map(col => (
                    <TableCell key={col.key} className="py-3.5 px-5">
                      {col.render ? col.render(row[col.key], row) : (
                        col.key === "status" ? (
                          <Badge className={cn(
                            "font-medium text-xs px-2.5 py-0.5 rounded-full border",
                            STATUS_COLORS[row[col.key]] || "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {row[col.key] || "—"}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-700">{row[col.key] ?? "—"}</span>
                        )
                      )}
                    </TableCell>
                  ))}
                  {(onEditar || onDeletar || acoes.length > 0) && (
                    <TableCell className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {acoes.map((acao, ai) => {
                          const isDisabled = typeof acao.disabled === "function" ? acao.disabled(row) : !!acao.disabled;
                          const titleText = typeof acao.title === "function" ? acao.title(row) : (acao.title || acao.titulo);
                          return (
                            <Button key={ai} variant="ghost" size="icon" title={titleText}
                              disabled={isDisabled}
                              onClick={() => !isDisabled && acao.onClick(row)}
                              className={cn("h-8 w-8 text-slate-400", acao.className, isDisabled && "opacity-30 cursor-not-allowed")}>
                              <acao.icone className="h-4 w-4" />
                            </Button>
                          );
                        })}
                        {onEditar && (
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(row)}
                            className="h-8 w-8 text-slate-400 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeletar && (
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => onDeletar(row)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600">
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
        </div>
        );
        }