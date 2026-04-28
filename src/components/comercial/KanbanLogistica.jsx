import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import DetalhesFrete from "./DetalhesFrete";

const COLUNAS = ["Enviado à logística", "Em análise", "Ajustes", "Concluído"];

export default function KanbanLogistica({ usuarioAtual: usuarioProp }) {
  const [solicitacoes, setSolicitacoes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState(null);
  const [busca, setBusca] = useState("");
  const [usuarioAtual, setUsuarioAtual] = useState(usuarioProp || null);

  useEffect(() => {
    if (usuarioProp) setUsuarioAtual(usuarioProp);
  }, [usuarioProp]);

  const carregarSolicitacoes = useCallback(async () => {
    try {
      const user = usuarioAtual;

      let query = supabase
        .from("solicitacaofrete")
        .select("*")
        .order("created_at", { ascending: false });

      // Admin vê tudo; Comercial vê suas próprias ou onde setor_origem = COMERCIAL
      if (user?.role !== "admin") {
        query = query.or(`vendedor_email.eq.${user?.email},setor_origem.eq.COMERCIAL`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const agrupadosPorStatus = {};
      COLUNAS.forEach(col => { agrupadosPorStatus[col] = []; });
      data?.forEach(sol => {
        if (agrupadosPorStatus[sol.status] && !sol.data_arquivamento) {
          agrupadosPorStatus[sol.status].push(sol);
        }
      });

      setSolicitacoes(agrupadosPorStatus);
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
      .channel("frete-comercial-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacaofrete" }, () => {
        carregarSolicitacoes();
      })
      .subscribe();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [usuarioAtual, carregarSolicitacoes]);

  const podeAlterarStatus = () => {
    return usuarioAtual?.role === "admin";
  };

  const mudarStatus = async (solicitacao, novoStatus) => {
    if (!podeAlterarStatus()) {
      alert("Apenas Logística pode mover solicitações");
      return;
    }
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
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar cliente ou número da solicitação..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {COLUNAS.map(status => (
          <div key={status} className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">{status}</h3>
              <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded">
                {filtroAplicado[status]?.length || 0}
              </span>
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
        <DetalhesFrete
          solicitacao={selecionada}
          onClose={() => setSelecionada(null)}
          onStatusChange={mudarStatus}
          usuarioAtual={usuarioAtual}
        />
      )}
    </>
  );
}