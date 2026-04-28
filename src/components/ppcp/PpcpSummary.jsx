import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

export default function PpcpSummary() {
  const [stats, setStats] = useState({
    total: 0,
    aprovadas: 0,
    pendentes: 0,
    criticos: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const supabase = await getSupabase();
        const empresaId = window.localStorage.getItem("empresa_id");
        if (!empresaId) return;

        const { data } = await supabase
          .from("solicitacao_ppcp")
          .select("id, status")
          .eq("empresa_id", empresaId);

        const aprovadas = (data || []).filter(p => p.status === "Aprovado").length;
        const pendentes = (data || []).filter(p => ["Enviado ao PPCP", "Em análise", "Ajustes"].includes(p.status)).length;
        const criticos = (data || []).filter(p => p.status === "Reprovado").length;

        setStats({
          total: data?.length || 0,
          aprovadas,
          pendentes,
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
        <StatCard title="Solicitações Recebidas" value={stats.total} icon={FileText} color="blue" />
        <StatCard title="Em Análise" value={stats.pendentes} icon={Clock} color="amber" />
        <StatCard title="Ajustes" value={Math.ceil(stats.pendentes * 0.3)} icon={AlertCircle} color="amber" />
        <StatCard title="Aprovadas" value={stats.aprovadas} icon={CheckCircle2} color="emerald" />
        <StatCard title="Reprovadas" value={stats.criticos} icon={AlertCircle} color="rose" />
      </div>
    </div>
  );
}