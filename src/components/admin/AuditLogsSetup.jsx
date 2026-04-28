import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export default function AuditLogsSetup() {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const sqlParts = [
    {
      title: "1. Criar Tabela audit_logs",
      code: `CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid,
  usuario_id uuid,
  usuario_nome text,
  usuario_email text NOT NULL,
  modulo text,
  tabela_afetada text,
  registro_id uuid,
  tipo_operacao text CHECK (tipo_operacao IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'BLOCK', 'UNBLOCK', 'PERMISSION_CHANGE')),
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  descricao text,
  ip_usuario text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);`
    },
    {
      title: "2. Criar Índices para Performance",
      code: `CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa ON public.audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON public.audit_logs(usuario_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela ON public.audit_logs(tabela_afetada);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tipo ON public.audit_logs(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);`
    },
    {
      title: "3. Ativar RLS (Row Level Security)",
      code: `ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;`
    },
    {
      title: "4. Criar Policy de SELECT",
      code: `CREATE POLICY audit_logs_select_policy ON public.audit_logs
  FOR SELECT
  USING (empresa_id = (SELECT empresa_id FROM public.erp_usuarios WHERE email = auth.jwt() ->> 'email') OR auth.jwt() ->> 'role' = 'admin');`
    },
    {
      title: "5. Criar Policy de INSERT",
      code: `CREATE POLICY audit_logs_insert_policy ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);`
    }
  ];

  const fullSql = sqlParts.map(p => p.code).join('\n\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1">
            <h3 className="font-semibold text-amber-900">Configuração Necessária: Tabela de Auditoria</h3>
            <p className="text-sm text-amber-800">
              Para ativar o sistema de auditoria completo, você precisa criar a tabela <code className="bg-amber-100 px-2 py-1 rounded">audit_logs</code> no Supabase.
            </p>
            <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
              <li>Acesse seu projeto no <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Supabase</a></li>
              <li>Abra <strong>SQL Editor</strong> → <strong>New Query</strong></li>
              <li>Copie e execute o SQL abaixo</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-slate-900">SQL para Criar Tabela audit_logs</h4>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{sqlParts.length} partes</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="gap-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expandir
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar Tudo
                </>
              )}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-0 divide-y divide-slate-200">
            {sqlParts.map((part, idx) => (
              <div key={idx} className="p-6 bg-white hover:bg-slate-50 transition-colors">
                <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {part.title}
                </h5>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-40">
                  <code>{part.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {!expanded && (
          <div className="p-6 text-sm text-slate-500 text-center">
            Click em "Expandir" para ver todas as etapas do SQL
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">Sistema de Auditoria</h4>
        <p className="text-sm text-blue-800 mb-3">
          Após criar a tabela, o CIAMONARO ERP registrará automaticamente:
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Criação, alteração e exclusão de registros</li>
          <li>Mudanças de status e permissões</li>
          <li>Bloqueio/desbloqueio de registros</li>
          <li>Usuário, data/hora e módulo responsável</li>
          <li>Valores anteriores e novos dos campos alterados</li>
        </ul>
      </div>
    </div>
  );
}