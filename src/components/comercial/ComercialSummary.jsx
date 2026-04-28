import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

export default function ComercialSummary() {
  const [stats, setStats] = useState({
    totalPPCP: 0,
    totalFrete: 0,
    aprovados: 0,
    pendentes: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const supabase = await getSupabase();
        const empresaId = window.localStorage.getItem("empresa_id");
        if (!empresaId) return;

        const { data: ppcp } = await supabase
          .from("solicitacao_ppcp")
          .select("id")
          .eq("empresa_id", empresaId);

        const { data: frete } = await supabase
          .from("solicitacao_frete")
          .select("id, status")
          .eq("empresa_id", empresaId);

        const aprovados = (ppcp || []).filter(p => p.status === "Aprovado").length;
        const pendentes = (ppcp || []).length - aprovados;

        setStats({
          totalPPCP: ppcp?.length || 0,
          totalFrete: frete?.length || 0,
          aprovados,
          pendentes,
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
        <StatCard title="PPCP Pendentes" value={stats.pendentes} icon={FileText} color="amber" />
        <StatCard title="PPCP Aprovadas" value={stats.aprovados} icon={CheckCircle2} color="emerald" />
        <StatCard title="Frete Abertos" value={stats.totalFrete} icon={FileText} color="slate" />
        <StatCard title="Total Solicitações" value={stats.totalPPCP} icon={FileText} color="blue" />
        <StatCard title="Taxa Aprovação" value={stats.totalPPCP > 0 ? Math.round((stats.aprovados / stats.totalPPCP) * 100) : 0 + "%"} icon={CheckCircle2} color="cyan" />
      </div>
    </div>
  );
}