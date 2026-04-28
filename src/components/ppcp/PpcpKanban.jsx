import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PpcpDetalhes from "./PpcpDetalhes";
import { differenceInHours, parseISO } from "date-fns";

const COLUNAS = [
  "Enviado ao PPCP",
  "Em análise",
  "Ajustes",
  "Aprovado",
  "Reprovado",
];

export default function PpcpKanban({ usuarioAtual }) {
  const [solicitacoes, setSolicitacoes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState(null);
  const [arquivadas, setArquivadas] = useState({});

  const carregarSolicitacoes = useCallback(async () => {
    try {

      // Admin vê tudo; PPCP vê setor_destino = PPCP; outros veem suas próprias
      let query = supabase
        .from("solicitacaoppcp")
        .select("*")
        .order("created_at", { ascending: false });

      if (usuarioAtual?.role !== "admin") {
        query = query.or(`setor_destino.eq.PPCP,vendedor_email.eq.${usuarioAtual?.email}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const agrupadosPorStatus = {};
      const contadorArquivadas = {};
      COLUNAS.forEach(col => { agrupadosPorStatus[col] = []; });

      data?.forEach(sol => {
        if (agrupadosPorStatus[sol.status]) {
          if (!sol.data_arquivamento) {
            agrupadosPorStatus[sol.status].push(sol);
          } else {
            contadorArquivadas[sol.status] = (contadorArquivadas[sol.status] || 0) + 1;
          }
        }
      });

      setSolicitacoes(agrupadosPorStatus);
      setArquivadas(contadorArquivadas);
    } catch (error) {
      console.error("Erro ao carregar solicitações PPCP:", error);
    } finally {
      setLoading(false);
    }
  }, [usuarioAtual]);

  useEffect(() => {
    if (!usuarioAtual) return;
    carregarSolicitacoes();

    const channel = supabase
      .channel("ppcp-kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacaoppcp" }, () => {
        carregarSolicitacoes();
      })
      .subscribe();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [usuarioAtual, carregarSolicitacoes]);

  const mudarStatus = async (solicitacao, novoStatus) => {
    try {
      await supabase
        .from("solicitacaoppcp")
        .update({ status: novoStatus })
        .eq("id", solicitacao.id);

      setSelecionada(null);
    } catch (error) {
      console.error("Erro ao mudar status:", error);
    }
  };

  const arquivar = async (solicitacao) => {
    try {
      await supabase
        .from("solicitacaoppcp")
        .update({ data_arquivamento: new Date().toISOString() })
        .eq("id", solicitacao.id);
      setSelecionada(null);
    } catch (error) {
      console.error("Erro ao arquivar:", error);
    }
  };

  const getAlertaStyle = (sol) => {
    if (["Aprovado", "Reprovado"].includes(sol.status)) return "";
    if (!sol.data_entrega_cliente) return "";
    const horas = differenceInHours(parseISO(sol.data_entrega_cliente), new Date());
    if (horas < 4) return "border-l-4 border-l-red-600 bg-red-50";
    if (horas < 24) return "border-l-4 border-l-yellow-600 bg-yellow-50";
    return "";
  };

  const getAlertaBadge = (sol) => {
    if (!sol.data_entrega_cliente) return null;
    const horas = differenceInHours(parseISO(sol.data_entrega_cliente), new Date());
    if (horas < 4) return <Badge className="bg-red-600">CRÍTICO</Badge>;
    if (horas < 24) return <Badge className="bg-yellow-600">ALERTA</Badge>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg animate-pulse" style={{ background: '#3B5CCC' }} />
          <p className="text-sm text-slate-500">Carregando solicitações…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        {COLUNAS.map(status => (
          <div key={status} className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">{status}</h3>
              <div className="flex gap-1">
                <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded">
                  {solicitacoes[status]?.length || 0}
                </span>
                {arquivadas[status] > 0 && (
                  <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                    +{arquivadas[status]}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3 min-h-[500px]">
              {(solicitacoes[status] || []).map(sol => (
                <Card
                  key={sol.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${getAlertaStyle(sol)}`}
                  onClick={() => setSelecionada(sol)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">{sol.numero_solicitacao}</p>
                          <p className="text-xs text-slate-600">{sol.cliente_nome}</p>
                        </div>
                        {getAlertaBadge(sol)}
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p><span className="font-medium">{sol.quantidade}</span> unidades</p>
                        <p>Entrega: {new Date(sol.data_entrega_cliente).toLocaleDateString("pt-BR")}</p>
                      </div>
                      {["Enviado ao PPCP", "Em análise", "Ajustes"].includes(sol.status) && (
                        <MessageSquare className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selecionada && (
        <PpcpDetalhes
          solicitacao={selecionada}
          onClose={() => setSelecionada(null)}
          onStatusChange={mudarStatus}
          onArquivar={arquivar}
          usuarioAtual={usuarioAtual}
          onRefresh={carregarSolicitacoes}
        />
      )}
    </>
  );
}