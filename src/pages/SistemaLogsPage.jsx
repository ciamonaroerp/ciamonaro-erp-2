import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Search, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import moment from "moment";

async function fetchLogs(empresa_id) {
  const { data, error } = await supabase.from('sistema_logs').select('*').eq('empresa_id', empresa_id).order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return data || [];
}

function NivelBadge({ nivel }) {
  const map = {
    ERROR: "bg-red-100 text-red-700 border-red-200",
    WARN: "bg-yellow-100 text-yellow-700 border-yellow-200",
    INFO: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${map[nivel] || map.INFO}`}>
      {nivel || "INFO"}
    </span>
  );
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const temDetalhes = !!log.dados_erro;

  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-sm"
        onClick={() => temDetalhes && setExpanded(v => !v)}
      >
        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
          {moment(log.created_at).format("DD/MM/YY HH:mm:ss")}
        </td>
        <td className="px-4 py-3">
          <NivelBadge nivel={log.nivel} />
        </td>
        <td className="px-4 py-3 font-medium text-slate-700">{log.modulo || "—"}</td>
        <td className="px-4 py-3 text-slate-500">{log.acao || "—"}</td>
        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{log.mensagem_erro || "—"}</td>
        <td className="px-4 py-3 text-slate-400 text-xs">{log.usuario_email || "—"}</td>
        <td className="px-4 py-3 text-center">
          {temDetalhes && (
            expanded
              ? <ChevronDown className="h-4 w-4 text-slate-400 mx-auto" />
              : <ChevronRight className="h-4 w-4 text-slate-400 mx-auto" />
          )}
        </td>
      </tr>
      {expanded && temDetalhes && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-6 pb-4 pt-1">
            <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-600 whitespace-pre-wrap">
              {(() => {
                try { return JSON.stringify(JSON.parse(log.dados_erro), null, 2); }
                catch { return log.dados_erro; }
              })()}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export default function SistemaLogsPage() {
  const { empresa_id } = useEmpresa();
  const [search, setSearch] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("TODOS");
  const [filtroModulo, setFiltroModulo] = useState("TODOS");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["sistema_logs", empresa_id],
    queryFn: () => fetchLogs(empresa_id),
    enabled: !!empresa_id,
    refetchInterval: 30000,
  });

  const modulos = ["TODOS", ...Array.from(new Set(logs.map(l => l.modulo).filter(Boolean))).sort()];

  const filtered = logs.filter(l => {
    const matchNivel = filtroNivel === "TODOS" || l.nivel === filtroNivel;
    const matchModulo = filtroModulo === "TODOS" || l.modulo === filtroModulo;
    const matchSearch = !search || [l.mensagem_erro, l.usuario_email, l.acao].some(
      v => v && v.toLowerCase().includes(search.toLowerCase())
    );
    return matchNivel && matchModulo && matchSearch;
  });

  const totalErros = logs.filter(l => l.nivel === "ERROR").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Logs do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Registro de erros e eventos do ERP</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total de Registros</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{logs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Erros</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalErros}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Módulos com Erros</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {new Set(logs.filter(l => l.nivel === "ERROR").map(l => l.modulo)).size}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar mensagem, usuário, ação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroNivel} onValueChange={setFiltroNivel}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os Níveis</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroModulo} onValueChange={setFiltroModulo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            {modulos.map(m => (
              <SelectItem key={m} value={m}>{m === "TODOS" ? "Todos os Módulos" : m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Carregando logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Data/Hora</th>
                  <th className="px-4 py-3 text-left">Nível</th>
                  <th className="px-4 py-3 text-left">Módulo</th>
                  <th className="px-4 py-3 text-left">Ação</th>
                  <th className="px-4 py-3 text-left">Mensagem</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-center w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 text-right">
            Exibindo {filtered.length} de {logs.length} registros (últimos 500)
          </div>
        )}
      </div>
    </div>
  );
}