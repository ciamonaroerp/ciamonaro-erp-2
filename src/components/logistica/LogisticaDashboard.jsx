import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

export default function LogisticaDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    enviadas: 0,
    emAnalise: 0,
    emAjustes: 0,
    concluidas: 0,
    cotacoesPendentes: 0,
    taxaConclusao: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarStats();
  }, []);

  const carregarStats = async () => {
    try {
      const supabase = await getSupabase();

      // Tenta com filtro setor_destino; se coluna não existir, busca todos
      let { data, error } = await supabase
        .from("solicitacaofrete")
        .select("*")
        .eq("setor_destino", "LOGISTICA")
        .is("data_arquivamento", null);

      if (error?.code === "PGRST204" || error?.message?.includes("setor_destino")) {
        const fallback = await supabase
          .from("solicitacaofrete")
          .select("*")
          .is("data_arquivamento", null);
        data = fallback.data;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const stats = {
        total: data.length,
        enviadas: data.filter(s => s.status === "Enviado à logística").length,
        emAnalise: data.filter(s => s.status === "Em análise").length,
        emAjustes: data.filter(s => s.status === "Ajustes").length,
        concluidas: data.filter(s => s.status === "Concluído").length,
        cotacoesPendentes: data.filter(s => s.status !== "Concluído").length,
        taxaConclusao: 0,
      };

      stats.taxaConclusao =
        stats.total > 0 ? ((stats.concluidas / stats.total) * 100).toFixed(0) : 0;

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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
      <StatCard title="Solicitações Recebidas" value={stats.total} icon={Clock} color="blue" />
      <StatCard title="Em Análise" value={stats.emAnalise} icon={Clock} color="amber" />
      <StatCard title="Ajustes" value={stats.emAjustes} icon={AlertCircle} color="amber" />
      <StatCard title="Concluído" value={stats.concluidas} icon={CheckCircle2} color="emerald" />
      <StatCard title="Taxa Conclusão" value={stats.taxaConclusao + "%"} icon={TrendingUp} color="cyan" />
    </div>
  );
}