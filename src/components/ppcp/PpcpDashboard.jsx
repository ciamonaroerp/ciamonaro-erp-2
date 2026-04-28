import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/admin/StatCard";
import { differenceInHours, parseISO } from "date-fns";

export default function PpcpDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    aprovadas: 0,
    reprovadas: 0,
    alertas: 0,
    criticos: 0,
    urgentes: 0,
    taxaAprovacao: 0,
  });
  const [loading, setLoading] = useState(true);
  const [urgentes, setUrgentes] = useState([]);

  useEffect(() => {
    carregarStats();
  }, []);

  const carregarStats = async () => {
    try {
      setLoading(true);
      const supabase = await getSupabase();

      // Tenta com filtro setor_destino; se coluna não existir, busca todos os registros PPCP
      let { data, error } = await supabase
        .from("solicitacaoppcp")
        .select("*")
        .eq("setor_destino", "PPCP")
        .is("data_arquivamento", null);

      if (error?.code === "PGRST204" || error?.message?.includes("setor_destino")) {
        const fallback = await supabase
          .from("solicitacaoppcp")
          .select("*")
          .is("data_arquivamento", null);
        data = fallback.data;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const agora = new Date();
      const urgentList = [];

      const stats = {
        total: data.length,
        pendentes: data.filter(s => 
          ["Enviado ao PPCP", "Em análise", "Ajustes"].includes(s.status)
        ).length,
        aprovadas: data.filter(s => s.status === "Aprovado").length,
        reprovadas: data.filter(s => s.status === "Reprovado").length,
        alertas: 0,
        criticos: 0,
        urgentes: 0,
        taxaAprovacao: 0,
      };

      // Calcular urgentes (≤30 dias) e alertas SLA
      data.forEach(sol => {
        if (sol.data_entrega_cliente) {
          const horasRestantes = differenceInHours(
            parseISO(sol.data_entrega_cliente),
            agora
          );

          // Urgentes: ≤30 dias
          if (horasRestantes > 0 && horasRestantes <= 30 * 24) {
            stats.urgentes++;
            urgentList.push(sol);
          }

          // Alertas SLA
          if (sol.status !== "Aprovado" && sol.status !== "Reprovado") {
            if (horasRestantes > 24) {
              stats.criticos++;
            } else if (horasRestantes > 4) {
              stats.alertas++;
            }
          }
        }
      });

      stats.taxaAprovacao =
        stats.total > 0 ? ((stats.aprovadas / stats.total) * 100).toFixed(0) : 0;

      setStats(stats);
      setUrgentes(urgentList.slice(0, 5));
    } catch (error) {
      console.error("Erro ao carregar stats:", error);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return <div className="p-4 text-slate-500">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alertas críticos - barra destacada */}
      {stats.criticos > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="font-semibold text-red-900">{stats.criticos} solicitação(ões) crítica(s) - Sem resposta há 24h+</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5 Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        <StatCard title="Solicitações Recebidas" value={stats.total} icon={Clock} color="blue" />
        <StatCard title="Em Análise" value={stats.pendentes} icon={Clock} color="amber" />
        <StatCard title="Ajustes" value={stats.alertas} icon={AlertCircle} color="amber" />
        <StatCard title="Aprovadas" value={stats.aprovadas} icon={CheckCircle2} color="emerald" />
        <StatCard title="Reprovadas" value={stats.reprovadas} icon={AlertCircle} color="rose" />
      </div>
    </div>
  );
}