import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

export default function DashboardPPCP() {
  const [stats, setStats] = useState({
    total: 0,
    enviado: 0,
    emAnalise: 0,
    emAjustes: 0,
    aprovado: 0,
    reprovado: 0,
    alertas: 0,
    criticos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarStats();
  }, []);

  const carregarStats = async () => {
    try {
      setLoading(true);
      const supabase = await getSupabase();

      const { data } = await supabase.from("solicitacaoppcp").select("*");

      const stats = {
        total: data?.length || 0,
        enviado: data?.filter((s) => s.status === "Enviado ao PPCP").length || 0,
        emAnalise: data?.filter((s) => s.status === "Em análise").length || 0,
        emAjustes: data?.filter((s) => s.status === "Ajustes").length || 0,
        aprovado: data?.filter((s) => s.status === "Aprovado").length || 0,
        reprovado: data?.filter((s) => s.status === "Reprovado").length || 0,
        alertas: data?.filter((s) => s.alerta_sla === "alerta").length || 0,
        criticos: data?.filter((s) => s.alerta_sla === "crítico").length || 0,
      };

      setStats(stats);
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
    <div className="w-full overflow-x-auto">
      <div className="grid grid-cols-5 gap-5 min-w-max lg:min-w-0 lg:grid-cols-5">
        <StatCard title="Enviados" value={stats.enviado} icon={Clock} color="slate" />
        <StatCard title="Em Análise" value={stats.emAnalise} icon={Clock} color="amber" />
        <StatCard title="Aprovadas" value={stats.aprovado} icon={CheckCircle2} color="emerald" />
        <StatCard title="Ajustes" value={stats.emAjustes} icon={AlertCircle} color="amber" />
        <StatCard title="Reprovados" value={stats.reprovado} icon={AlertCircle} color="rose" />
      </div>
    </div>
  );
}