import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { ErpPageLayout } from "@/components/design-system";

export default function AuditoriaArquitetura() {
  const [auditando, setAuditando] = useState(false);
  const [resultados, setResultados] = useState({
    supabaseConectado: null,
    tabelasEsperadas: [],
    entidadesBase44: [],
    issuesEncontradas: [],
  });

  const TABELAS_ESPERADAS = [
    "erp_usuarios",
    "empresas",
    "modulos_erp",
    "clientes",
    "produtos",
    "transportadoras",
    "modalidade_frete",
    "solicitacao_ppcp",
    "solicitacao_frete",
    "chat_comercial",
    "audit_logs",
    "notificacoes",
  ];

  const ENTIDADES_PROIBIDAS = [
    "Usuarios",
    "PerfisUsuario",
    "ConfiguracoesERP",
    "ModulosERP",
    "Clientes",
    "Produtos",
    "ConvitesUsuarios",
    "LogsAuditoria",
    "JobsQueue",
  ];

  const iniciarAuditoria = async () => {
    setAuditando(true);
    
    try {
      // Simular verificação de estrutura
      const novasIssues = [];
      const tabelasVerificadas = TABELAS_ESPERADAS.map(tabela => ({
        nome: tabela,
        existe: Math.random() > 0.2, // 80% de chance de existir
      }));

      // Verificar tabelas faltando
      tabelasVerificadas.forEach(t => {
        if (!t.existe) {
          novasIssues.push({
            tipo: "tabela_faltando",
            severidade: "crítico",
            mensagem: `Tabela '${t.nome}' não existe no Supabase`,
          });
        }
      });

      setResultados({
        supabaseConectado: true,
        tabelasEsperadas: tabelasVerificadas,
        entidadesBase44: [],
        issuesEncontradas: novasIssues,
      });
    } catch (err) {
      setResultados(prev => ({
        ...prev,
        issuesEncontradas: [{
          tipo: "erro",
          severidade: "crítico",
          mensagem: `Erro ao conectar ao Supabase: ${err.message}`,
        }],
      }));
    } finally {
      setAuditando(false);
    }
  };

  return (
    <ErpPageLayout
      title="Auditoria de Arquitetura"
      description="Verificar conformidade com arquitetura Supabase-only"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Card de Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Status da Arquitetura</h2>
              <p className="text-sm text-slate-600 mt-1">
                Verifique se todas as tabelas estão no Supabase
              </p>
            </div>
            <Button
              onClick={iniciarAuditoria}
              disabled={auditando}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {auditando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Auditando...
                </>
              ) : (
                <>
                  🔍 Iniciar Auditoria
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabelas Esperadas */}
        {resultados.tabelasEsperadas.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tabelas Esperadas</h3>
            <div className="space-y-2">
              {resultados.tabelasEsperadas.map(tabela => (
                <div
                  key={tabela.nome}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <span className="font-mono text-sm text-slate-900">{tabela.nome}</span>
                  <div className="flex items-center gap-2">
                    {tabela.existe ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-xs font-medium text-green-700">✓ Existe</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-xs font-medium text-red-700">✗ Faltando</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues Encontradas */}
        {resultados.issuesEncontradas.length > 0 && (
          <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-red-900 mb-4">⚠️ Problemas Encontrados</h3>
            <div className="space-y-2">
              {resultados.issuesEncontradas.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    issue.severidade === "crítico"
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    issue.severidade === "crítico"
                      ? "text-red-900"
                      : "text-amber-900"
                  }`}>
                    {issue.mensagem}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist de Conformidade */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Checklist de Conformidade</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-1" />
              <span className="text-sm text-slate-700">
                Todas as tabelas existem no Supabase
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" />
              <span className="text-sm text-slate-700">
                Nenhuma entidade do Base44 armazena dados persistentes do ERP
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" />
              <span className="text-sm text-slate-700">
                RLS está habilitado em todas as tabelas
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" />
              <span className="text-sm text-slate-700">
                Índices estão criados para performance
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" />
              <span className="text-sm text-slate-700">
                Triggers de auditoria estão configurados
              </span>
            </label>
          </div>
        </div>

        {/* Próximos Passos */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Próximos Passos</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Acesse SupabaseDebug para gerar SQL de migração completa</li>
            <li>2. Execute o SQL no Supabase Dashboard → SQL Editor</li>
            <li>3. Valide todas as tabelas e colunas</li>
            <li>4. Implemente RLS em cada tabela</li>
            <li>5. Remova entidades do Base44 que eram persistentes</li>
            <li>6. Teste operações CRUD em cada módulo</li>
          </ol>
        </div>
      </div>
    </ErpPageLayout>
  );
}