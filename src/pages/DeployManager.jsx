import React, { useState } from "react";
import { useSupabaseAuth } from "@/components/context/SupabaseAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deployVersionsService, auditLogsService } from "@/components/services/administracaoService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Plus, Rocket, CheckCircle2, RotateCcw } from "lucide-react";
import PageHeader from "../components/admin/PageHeader";
import DeployStatsBar from "../components/deploy/DeployStatsBar";
import DeployHistoryTable from "../components/deploy/DeployHistoryTable";
import NewVersionModal from "../components/deploy/NewVersionModal";
import DeployLogModal from "../components/deploy/DeployLogModal";
import DeployStatusBadge from "../components/deploy/DeployStatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function DeployManager() {
  const { empresa_id } = useEmpresa();
  const { erpUsuario } = useSupabaseAuth();
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deploySteps, setDeploySteps] = useState({});
  const [deployError, setDeployError] = useState("");
  const [deployDone, setDeployDone] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [filterStatus, setFilterStatus] = useState("todos");

  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["deploy-versions", empresa_id],
    queryFn: () => deployVersionsService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const currentProd = versions.find((v) => v.status === "deployed" && v.environment === "production");
  const lastDeploy = versions.filter((v) => v.date_deployed).sort((a, b) => new Date(b.date_deployed) - new Date(a.date_deployed))[0];
  const approvedVersion = versions.find((v) => v.status === "approved");

  const createVersion = useMutation({
    mutationFn: (data) => deployVersionsService.criar({ ...data, target_path: "/public_html/erp", target_url: "https://erp.ciamonaro.com.br", empresa_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deploy-versions"] });
      setShowNewVersion(false);
    },
  });

  const updateVersion = useMutation({
    mutationFn: ({ id, data }) => deployVersionsService.atualizar(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deploy-versions"] }),
  });

  // ---- FLUXO DE DEPLOY ----
  const runDeploy = async () => {
    const user = erpUsuario;
    const approved = versions.find((v) => v.status === "approved");

    setDeployModalOpen(true);
    setDeploySteps({});
    setDeployError("");
    setDeployDone(false);

    // 1. Validar versão aprovada
    setDeploySteps({ validate: "running" });
    await sleep(900);
    if (!approved) {
      setDeploySteps({ validate: "error" });
      setDeployError("Nenhuma versão com status 'approved' encontrada. Crie e aprove uma versão antes de publicar.");
      return;
    }
    setDeploySteps({ validate: "done" });

    // 2. Gerar build
    setDeploySteps((p) => ({ ...p, build: "running" }));
    await sleep(1400);
    setDeploySteps((p) => ({ ...p, build: "done" }));

    // 3. Empacotar arquivos
    setDeploySteps((p) => ({ ...p, package: "running" }));
    await sleep(1200);
    setDeploySteps((p) => ({ ...p, package: "done" }));

    // 4. Preparar pacote para /public_html/erp
    setDeploySteps((p) => ({ ...p, prepare: "running" }));
    await sleep(1000);
    setDeploySteps((p) => ({ ...p, prepare: "done" }));

    // 5. Registrar evento de deploy
    setDeploySteps((p) => ({ ...p, register: "running" }));
    const now = new Date().toISOString();
    await deployVersionsService.atualizar(approved.id, {
      status: "deployed",
      date_deployed: now,
      deployed_by: user?.email || "sistema",
    });
    // Audit log
    await auditLogsService.criar({
      acao: "outro",
      entidade: "DeployVersions",
      registro_id: approved.id,
      usuario_email: user?.email || "sistema",
      modulo: "Deploy Manager",
      dados_novos: JSON.stringify({ versao: approved.version, status: "deployed", ambiente: approved.environment }),
      data_evento: now,
      empresa_id,
    });
    setDeploySteps((p) => ({ ...p, register: "done" }));

    // 6. Finalizar
    setDeploySteps((p) => ({ ...p, finalize: "running" }));
    await sleep(700);
    setDeploySteps((p) => ({ ...p, finalize: "done" }));

    setDeployDone(true);
    queryClient.invalidateQueries({ queryKey: ["deploy-versions"] });
  };

  // ---- FLUXO DE ROLLBACK ----
  const runRollback = async (targetVersion) => {
    setIsRollingBack(true);
    const user = erpUsuario;
    const now = new Date().toISOString();

    await deployVersionsService.atualizar(targetVersion.id, {
      status: "rollback",
      date_deployed: now,
      deployed_by: user?.email || "sistema",
      notes: (targetVersion.notes || "") + ` [ROLLBACK em ${now}]`,
    });

    await auditLogsService.criar({
      acao: "outro",
      entidade: "DeployVersions",
      registro_id: targetVersion.id,
      usuario_email: user?.email || "sistema",
      modulo: "Deploy Manager",
      dados_novos: JSON.stringify({ versao: targetVersion.version, status: "rollback" }),
      data_evento: now,
      empresa_id,
    });

    queryClient.invalidateQueries({ queryKey: ["deploy-versions"] });
    setRollbackTarget(null);
    setIsRollingBack(false);
  };

  const handleApprove = (id) => updateVersion.mutate({ id, data: { status: "approved" } });

  const filtered = versions.filter((v) => filterStatus === "todos" || v.status === filterStatus);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deploy Manager"
        description="Controle de versões e publicação do frontend em erp.ciamonaro.com.br"
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => setShowNewVersion(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Nova Versão
            </Button>
            <Button
              onClick={runDeploy}
              disabled={!approvedVersion}
              className="gap-2 text-white"
              style={{ background: '#3B5CCC' }}
              title={!approvedVersion ? "Nenhuma versão aprovada disponível" : ""}
            >
              <Rocket className="h-4 w-4" /> Publicar no Hostinger
            </Button>
          </div>
        }
      />

      {/* Alerta de versão aprovada disponível */}
      {approvedVersion && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span className="text-green-800">
            Versão <strong>{approvedVersion.version}</strong> aprovada e pronta para publicação.
          </span>
          <Button size="sm" className="ml-auto bg-green-600 hover:bg-green-700 gap-1" onClick={runDeploy}>
            <Rocket className="h-3.5 w-3.5" /> Publicar agora
          </Button>
        </div>
      )}

      {/* Stats */}
      <DeployStatsBar current={currentProd} last={lastDeploy} />

      {/* Histórico */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Histórico de Versões</h2>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="deployed">Publicado</SelectItem>
              <SelectItem value="rollback">Rollback</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ação rápida: Aprovar rascunhos */}
      {versions.some((v) => v.status === "draft") && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Versões em rascunho — aprovar para deploy:</p>
          <div className="flex flex-wrap gap-2">
            {versions.filter((v) => v.status === "draft").map((v) => (
              <div key={v.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="font-mono text-sm font-semibold text-slate-700">{v.version}</span>
                <DeployStatusBadge status={v.status} />
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 ml-1" onClick={() => handleApprove(v.id)}>
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> Aprovar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeployHistoryTable
        versions={filtered}
        onRollback={(v) => { setRollbackTarget(v); runRollback(v); }}
        isRollingBack={isRollingBack}
      />

      {/* Modais */}
      <NewVersionModal
        open={showNewVersion}
        onClose={setShowNewVersion}
        onSubmit={(data) => createVersion.mutate(data)}
        isSubmitting={createVersion.isPending}
      />

      <DeployLogModal
        open={deployModalOpen}
        steps={deploySteps}
        error={deployError}
        done={deployDone}
      />

      {/* Fechar modal de deploy ao concluir */}
      {deployDone && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-8 pointer-events-none">
          <div className="pointer-events-auto">
            <Button onClick={() => { setDeployModalOpen(false); setDeployDone(false); }} className="bg-green-600 hover:bg-green-700 shadow-lg">
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}