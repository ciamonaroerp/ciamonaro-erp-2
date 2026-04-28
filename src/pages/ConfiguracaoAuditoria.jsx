import React from "react";
import { useEmpresa } from "@/components/context/EmpresaContext";
import AuditLogsSetup from "@/components/admin/AuditLogsSetup";

export default function ConfiguracaoAuditoria() {
  const { empresa_id } = useEmpresa();

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuração do Sistema de Auditoria</h1>
        <p className="text-slate-500 mt-2">
          Configure o rastreamento automático de atividades no CIAMONARO ERP
        </p>
      </div>

      <AuditLogsSetup />

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3">
        <h4 className="font-semibold text-slate-900">Próximas Etapas</h4>
        <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
          <li>Copie o SQL acima</li>
          <li>Acesse o Supabase SQL Editor</li>
          <li>Execute o SQL</li>
          <li>Aguarde a confirmação de sucesso</li>
          <li>Acesse a página <strong>Logs de Auditoria</strong> para ver os registros</li>
        </ol>
      </div>
    </div>
  );
}