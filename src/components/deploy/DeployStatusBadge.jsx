import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Rocket, RotateCcw, XCircle, FileEdit } from "lucide-react";

const config = {
  draft:    { label: "Rascunho",  color: "bg-slate-100 text-slate-700", icon: FileEdit },
  approved: { label: "Aprovado",  color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  deployed: { label: "Publicado", color: "bg-blue-100 text-blue-800",   icon: Rocket },
  rollback: { label: "Rollback",  color: "bg-orange-100 text-orange-800", icon: RotateCcw },
  failed:   { label: "Falhou",    color: "bg-red-100 text-red-800",     icon: XCircle },
};

export default function DeployStatusBadge({ status }) {
  const cfg = config[status] || config.draft;
  const Icon = cfg.icon;
  return (
    <Badge className={`text-xs gap-1 ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}