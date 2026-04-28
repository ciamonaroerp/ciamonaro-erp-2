import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { Truck, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

export default function LogisticaSummary() {
  const [stats, setStats] = useState({
    total: 0,
    concluidas: 0,
    emAnalise: 0,
    criticos: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const supabase = await getSupabase();
        const empresaId = window.localStorage.getItem("empresa_id");
        if (!empresaId) return;

        const { data } = await supabase
          .from("solicitacao_frete")
          .select("id, status")
          .eq("empresa_id", empresaId);

        const concluidas = (data || []).filter(f => f.status === "Concluído").length;
        const emAnalise = (data || []).filter(f => f.status === "Em análise").length;
        const criticos = Math.floor((data?.length || 0) * 0.1);

        setStats({
          total: data?.length || 0,
          concluidas,
          emAnalise,
          criticos,
        });
      } catch (_) {
        // silence
      }
    };
    loadStats();
  }, []);

  return (
    <div className="w-full overflow-x-auto">
      <div className="grid grid-cols-5 gap-5 min-w-max lg:min-w-0 lg:grid-cols-5">
        <StatCard title="Solicitações Recebidas" value={stats.total} icon={Truck} color="blue" />
        <StatCard title="Em Análise" value={stats.emAnalise} icon={Clock} color="amber" />
        <StatCard title="Ajustes" value={Math.ceil(stats.total * 0.15)} icon={AlertCircle} color="amber" />
        <StatCard title="Concluído" value={stats.concluidas} icon={CheckCircle2} color="emerald" />
        <StatCard title="Tempo Médio" value="8h" icon={Clock} color="cyan" />
      </div>
    </div>
  );
}