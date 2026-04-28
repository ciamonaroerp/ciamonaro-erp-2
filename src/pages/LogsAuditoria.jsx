import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACAO_CONFIG = {
  CREATE:         { color: "bg-blue-100 text-blue-800",     label: "Criação" },
  criar:          { color: "bg-blue-100 text-blue-800",     label: "Criação" },
  UPDATE:         { color: "bg-amber-100 text-amber-800",   label: "Alteração" },
  STATUS_CHANGE:  { color: "bg-purple-100 text-purple-800", label: "Mudança Status" },
  editar:         { color: "bg-amber-100 text-amber-800",   label: "Alteração" },
  DELETE:         { color: "bg-red-100 text-red-800",       label: "Exclusão" },
  deletar:        { color: "bg-red-100 text-red-800",       label: "Exclusão" },
  inativar:       { color: "bg-red-100 text-red-800",       label: "Inativação" },
  ativar:         { color: "bg-green-100 text-green-800",   label: "Ativação" },
  login:          { color: "bg-slate-100 text-slate-700",   label: "Login" },
  logout:         { color: "bg-slate-100 text-slate-700",   label: "Logout" },
  enviar_convite: { color: "bg-purple-100 text-purple-800", label: "Convite" },
  sincronizar:    { color: "bg-cyan-100 text-cyan-800",     label: "Sincronização" },
  configurar:     { color: "bg-orange-100 text-orange-800", label: "Configuração" },
};

function JsonCell({ value }) {
  const [open, setOpen] = useState(false);
  if (!value) return <span className="text-slate-400">—</span>;
  let display = value;
  try { display = JSON.stringify(JSON.parse(value), null, 2); } catch {}
  const short = typeof display === 'string' && display.length > 50 ? display.slice(0, 50) + "..." : display;
  return (
    <div>
      <span className="text-xs font-mono text-slate-600 cursor-pointer hover:underline" onClick={() => setOpen(v => !v)}>
        {open ? display : short}
        {display.length > 50 && (open ? <ChevronUp className="inline h-3 w-3 ml-1" /> : <ChevronDown className="inline h-3 w-3 ml-1" />)}
      </span>
    </div>
  );
}

export default function LogsAuditoria() {
  const [busca, setBusca] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [filtroAcao, setFiltroAcao] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["audit-logs-v3"],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: usuariosAtivos = [] } = useQuery({
    queryKey: ["usuarios-ativos-logs"],
    queryFn: async () => {
      const { data } = await supabase.from('erp_usuarios').select('id,nome,email').eq('status', 'Ativo');
      return data || [];
    },
  });

  const modulos   = useMemo(() => [...new Set(logs.map(l => l.modulo).filter(Boolean))].sort(), [logs]);
  const acoes     = useMemo(() => [...new Set(logs.map(l => l.acao).filter(Boolean))].sort(), [logs]);

  const logsFiltrados = useMemo(() => {
    return logs.filter(log => {
      const email = log.usuario_email || "";
      const nome = log.usuario_nome || "";
      const matchBusca = !busca ||
        email.toLowerCase().includes(busca.toLowerCase()) ||
        nome.toLowerCase().includes(busca.toLowerCase()) ||
        log.entidade?.toLowerCase().includes(busca.toLowerCase()) ||
        log.campo_alterado?.toLowerCase().includes(busca.toLowerCase()) ||
        log.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
        log.tabela_afetada?.toLowerCase().includes(busca.toLowerCase());
      const matchUsuario  = filtroUsuario === "todos" || log.usuario_id === filtroUsuario;
      const matchModulo   = filtroModulo  === "todos" || log.modulo === filtroModulo;
      const matchAcao     = filtroAcao    === "todos" || log.acao === filtroAcao;
      const dataLog = new Date(log.created_at || log.data_evento);
      const matchDataInicio = !dataInicio || dataLog >= new Date(dataInicio);
      const matchDataFim    = !dataFim    || dataLog <= new Date(dataFim + 'T23:59:59');
      return matchBusca && matchUsuario && matchModulo && matchAcao && matchDataInicio && matchDataFim;
    });
  }, [logs, busca, filtroUsuario, filtroModulo, filtroAcao, dataInicio, dataFim]);

  const temFiltro = busca || filtroUsuario !== "todos" || filtroModulo !== "todos" || filtroAcao !== "todos" || dataInicio || dataFim;

  const formatData = (d) => {
    try { return format(new Date(d), "dd/MM/yy HH:mm:ss", { locale: ptBR }); }
    catch { return "—"; }
  };

  const COLUNAS = [
    { key: "data_evento",     label: "Data/Hora",        cls: "w-32",   render: (l) => <span className="whitespace-nowrap text-xs font-medium text-slate-500">{formatData(l.created_at || l.data_evento)}</span> },
    { key: "usuario_nome",    label: "Usuário",          cls: "w-36",   render: (l) => <div><p className="text-xs font-medium text-slate-800 truncate max-w-[130px]" title={l.usuario_nome}>{l.usuario_nome || "—"}</p><p className="text-[10px] text-slate-400 truncate max-w-[130px]" title={l.usuario_email}>{l.usuario_email || ""}</p></div> },
    { key: "acao",            label: "Ação",             cls: "w-28",   render: (l) => { const cfg = ACAO_CONFIG[l.acao] || { color: "bg-slate-100 text-slate-700", label: l.acao }; return <Badge className={`${cfg.color} text-xs whitespace-nowrap`}>{cfg.label}</Badge>; } },
    { key: "entidade",        label: "Entidade",         cls: "w-28",   render: (l) => <span className="text-xs text-slate-700 font-medium truncate block max-w-[100px]" title={l.entidade}>{l.entidade || "—"}</span> },
    { key: "valor_anterior",  label: "Valor Anterior",   cls: "w-32",   render: (l) => l.valor_anterior != null ? <code className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs truncate block max-w-[120px]" title={l.valor_anterior}>{String(l.valor_anterior)}</code> : <span className="text-slate-400">—</span> },
    { key: "valor_novo",      label: "Valor Novo",       cls: "w-32",   render: (l) => l.valor_novo != null ? <code className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs truncate block max-w-[120px]" title={l.valor_novo}>{String(l.valor_novo)}</code> : <span className="text-slate-400">—</span> },
    { key: "dados_anteriores",label: "Dados Anteriores", cls: "w-40",   render: (l) => <JsonCell value={l.dados_anteriores} /> },
    { key: "dados_novos",     label: "Dados Novos",      cls: "w-40",   render: (l) => <JsonCell value={l.dados_novos} /> },
    { key: "modulo",          label: "Módulo",           cls: "w-28",   render: (l) => <span className="text-xs text-slate-600 truncate block max-w-[100px]" title={l.modulo}>{l.modulo || "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Logs de Auditoria</h1>
          <p className="text-sm text-slate-500 mt-1">Histórico completo de ações realizadas no CIAMONARO ERP</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Erro ao carregar logs: {error.message}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar por usuário, entidade, campo, descrição..." value={busca}
              onChange={e => setBusca(e.target.value)} className="pl-9" />
          </div>

          {/* Filtro por usuário (nome dos ativos) */}
          <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos usuários</SelectItem>
              {usuariosAtivos.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroModulo} onValueChange={setFiltroModulo}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos módulos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos módulos</SelectItem>
              {modulos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filtroAcao} onValueChange={setFiltroAcao}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas operações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas operações</SelectItem>
              {acoes.map(a => <SelectItem key={a} value={a}>{ACAO_CONFIG[a]?.label || a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">De:</label>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Até:</label>
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
          </div>
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={() => {
              setBusca(""); setFiltroUsuario("todos");
              setFiltroAcao("todos"); setFiltroModulo("todos"); setDataInicio(""); setDataFim("");
            }}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            Carregando registros de auditoria...
          </div>
        ) : logsFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Nenhum log encontrado</p>
            {logs.length === 0 && (
              <p className="text-slate-300 text-xs mt-1">A tabela audit_logs pode estar vazia ou sem permissão de leitura.</p>
            )}
          </div>
        ) : (
          <div>
            <table className="w-full text-sm table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {COLUNAS.map(col => (
                    <th key={col.key} className={`text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider ${col.cls || ""}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map((log, idx) => {
                  const isCritical = ["DELETE", "deletar", "inativar"].includes(log.acao);
                  return (
                    <tr key={log.id || idx} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isCritical ? 'bg-red-50/40' : ''}`}>
                      {COLUNAS.map(col => (
                        <td key={col.key} className="px-3 py-2.5 align-top">
                          {col.render(log)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{logsFiltrados.length} registro(s) exibido(s)</span>
        <span>{logs.length} registro(s) no total</span>
      </div>
    </div>
  );
}