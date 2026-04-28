import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import KanbanCard from "./KanbanCard";
import DetalhesSolicitacao from "./DetalhesSolicitacao";

const COLUNAS = [
  "Enviado ao PPCP",
  "Em análise",
  "Ajustes",
  "Aprovado",
  "Reprovado",
];

export default function KanbanPPCP({ usuarioAtual: usuarioProp }) {
  const [solicitacoes, setSolicitacoes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState(null);
  const [usuarioAtual, setUsuarioAtual] = useState(usuarioProp || null);

  useEffect(() => {
    if (usuarioProp) setUsuarioAtual(usuarioProp);
  }, [usuarioProp]);

  const carregarSolicitacoes = useCallback(async () => {
    try {
      const user = usuarioAtual;

      let query = supabase
        .from("solicitacaoppcp")
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
      console.error("Erro ao carregar solicitações PPCP:", error);
    } finally {
      setLoading(false);
    }
  }, [usuarioAtual]);

  useEffect(() => {
    if (!usuarioAtual) return;
    carregarSolicitacoes();

    const channel = supabase
      .channel("ppcp-comercial-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacaoppcp" }, () => {
        carregarSolicitacoes();
      })
      .subscribe();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [usuarioAtual, carregarSolicitacoes]);

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
          <div key={status} className="bg-slate-50 rounded-lg p-4 min-h-[600px]">
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">
              {status}
              <span className="text-xs text-slate-500 ml-2">
                ({solicitacoes[status]?.length || 0})
              </span>
            </h3>
            <div className="space-y-3">
              {(solicitacoes[status] || []).map(sol => (
                <div key={sol.id} onClick={() => setSelecionada(sol)} className="cursor-pointer">
                  <KanbanCard solicitacao={sol} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selecionada && (
        <DetalhesSolicitacao
          solicitacao={selecionada}
          tipo="PPCP"
          onClose={() => setSelecionada(null)}
          onStatusChange={() => {}}
        />
      )}
    </>
  );
}