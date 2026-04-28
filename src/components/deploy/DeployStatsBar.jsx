import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Rocket, Calendar, User, Globe } from "lucide-react";

export default function DeployStatsBar({ current, last }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Rocket}
        iconColor="text-blue-500"
        bg="bg-blue-50"
        label="Versão em Produção"
        value={current?.version || "—"}
        sub="environment: production"
      />
      <StatCard
        icon={Globe}
        iconColor="text-green-500"
        bg="bg-green-50"
        label="URL de Produção"
        value="erp.ciamonaro.com.br"
        sub={current?.target_path || "/public_html/erp"}
      />
      <StatCard
        icon={Calendar}
        iconColor="text-purple-500"
        bg="bg-purple-50"
        label="Último Deploy"
        value={last?.date_deployed ? format(new Date(last.date_deployed), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
        sub={last?.version || "Nenhum deploy"}
      />
      <StatCard
        icon={User}
        iconColor="text-orange-500"
        bg="bg-orange-50"
        label="Responsável"
        value={last?.deployed_by || "—"}
        sub="último deploy"
      />
    </div>
  );
}

function StatCard({ icon: IconComp, iconColor, bg, label, value, sub }) {
  const Icon = IconComp;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="font-semibold text-slate-800 text-sm truncate">{value}</p>
        <p className="text-xs text-slate-400 truncate">{sub}</p>
      </div>
    </div>
  );
}