import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { MessageSquare, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LogisticaDetalhes from "./LogisticaDetalhes";

const COLUNAS = [
  "Enviado à logística",
  "Em análise",
  "Ajustes",
  "Concluído",
];

export default function LogisticaKanban({ usuarioAtual }) {
  const [solicitacoes, setSolicitacoes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState(null);
  const [busca, setBusca] = useState("");
  const [arquivadas, setArquivadas] = useState({});

  const carregarSolicitacoes = useCallback(async () => {
    try {
      let query = supabase
        .from("solicitacaofrete")
        .select("*")
        .order("created_at", { ascending: false });

      if (usuarioAtual?.role !== "admin") {
        query = query.or(`setor_destino.eq.LOGISTICA,vendedor_email.eq.${usuarioAtual?.email}`);
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
      console.error("Erro ao carregar solicitações de frete:", error);
    } finally {
      setLoading(false);
    }
  }, [usuarioAtual]);

  useEffect(() => {
    if (!usuarioAtual) return;
    carregarSolicitacoes();

    const channel = supabase
      .channel("logistica-kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacaofrete" }, () => { carregarSolicitacoes(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [usuarioAtual, carregarSolicitacoes]);

  const mudarStatus = async (solicitacao, novoStatus) => {
    try {
      await supabase
        .from("solicitacaofrete")
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
        .from("solicitacaofrete")
        .update({ data_arquivamento: new Date().toISOString() })
        .eq("id", solicitacao.id);
      setSelecionada(null);
    } catch (error) {
      console.error("Erro ao arquivar:", error);
    }
  };

  const filtrados = () => {
    const resultado = {};
    COLUNAS.forEach(status => {
      resultado[status] = (solicitacoes[status] || []).filter(sol =>
        (sol.cliente_nome || "").toLowerCase().includes(busca.toLowerCase()) ||
        (sol.numero_solicitacao || "").toLowerCase().includes(busca.toLowerCase())
      );
    });
    return resultado;
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

  const filtroAplicado = filtrados();

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {COLUNAS.map(status => (
          <div key={status} className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">{status}</h3>
              <div className="flex gap-1">
                <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded">
                  {filtroAplicado[status]?.length || 0}
                </span>
                {arquivadas[status] > 0 && (
                  <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                    +{arquivadas[status]}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3 min-h-[500px]">
              {(filtroAplicado[status] || []).map(sol => (
                <Card
                  key={sol.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelecionada(sol)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{sol.numero_solicitacao}</p>
                      <p className="text-xs text-slate-600">{sol.cliente_nome}</p>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>CEP: <span className="font-medium">{sol.cep_destino}</span></p>
                      <p>Valor: <span className="font-medium">R$ {parseFloat(sol.valor_mercadoria || 0).toFixed(2)}</span></p>
                      <p>Entrega: {new Date(sol.data_entrega).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {sol.status === "Ajustes" && (
                      <MessageSquare className="h-3 w-3 text-blue-500" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selecionada && (
        <LogisticaDetalhes
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