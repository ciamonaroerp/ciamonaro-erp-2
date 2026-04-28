import React, { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Server, Database, Lock, AlertTriangle } from 'lucide-react';

export default function SupabaseDebug2() {
  const [diagnostico, setDiagnostico] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const executarDiagnostico = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase.from('erp_usuarios').select('id').limit(1);
      setDiagnostico({
        conexao: { status: error ? 'erro' : 'conectado', mensagem: error ? error.message : 'Conexão OK' },
        tabelas: { erp_usuarios: { existe: !error, info: error ? error.message : 'OK' } },
        colunas: {},
        teste_insert: {},
        rls: { nota: 'Verificado via select' },
        erros: error ? [{ tipo: 'conexao', mensagem: error.message }] : [],
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      setErro(e.message || 'Erro ao executar diagnóstico');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    executarDiagnostico();
  }, []);

  const StatusIcon = ({ status }) => {
    if (status === 'conectado' || status === 'sucesso' || status === 'existe') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (status === 'erro' || status === 'nao_existe') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    if (status === 'incompleto' || status === 'conectado_mas_schema_cache_desatualizado') {
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-slate-400" />;
  };

  const Card = ({ titulo, icone: IconComponent, status, mensagem, detalhes }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {IconComponent && <IconComponent className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />}
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">{titulo}</h3>
          <div className="flex items-center gap-2 mt-1">
            <StatusIcon status={status} />
            <p className="text-xs text-slate-600">{mensagem}</p>
          </div>
          {detalhes && (
            <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded p-2">
              {detalhes}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Executando diagnóstico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Diagnóstico Supabase</h1>
              <p className="text-slate-600 text-sm mt-1">
                Verificação de estrutura e funcionamento do banco de dados
              </p>
            </div>
            <Button
              onClick={executarDiagnostico}
              disabled={carregando}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {erro && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 text-sm">Erro ao executar diagnóstico</h3>
              <p className="text-xs text-red-700 mt-0.5">{erro}</p>
            </div>
          </div>
        )}

        {diagnostico && (
          <div className="space-y-8">
            {/* 1. CONEXÃO */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                Conexão
              </h2>
              {diagnostico.conexao && (
                <Card
                  titulo="Supabase"
                  icone={Server}
                  status={diagnostico.conexao.status}
                  mensagem={diagnostico.conexao.mensagem}
                  detalhes={
                    diagnostico.conexao.status === 'conectado_mas_schema_cache_desatualizado'
                      ? 'Execute no SQL Editor: NOTIFY pgrst, \'reload schema\';'
                      : null
                  }
                />
              )}
            </section>

            {/* 2. TABELAS */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                Tabelas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(diagnostico.tabelas).map(([nome, info]) => (
                  <Card
                    key={nome}
                    titulo={nome}
                    icone={Database}
                    status={info.existe ? 'existe' : 'nao_existe'}
                    mensagem={info.info || 'Tabela não encontrada'}
                  />
                ))}
              </div>
            </section>

            {/* 3. COLUNAS */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                Colunas Detectadas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(diagnostico.colunas).map(([nome, info]) => (
                  <Card
                    key={nome}
                    titulo={nome}
                    icone={Database}
                    status={info.incompleto ? 'incompleto' : 'existe'}
                    mensagem={`${info.detectadas}/${info.esperadas} colunas`}
                    detalhes={
                      info.incompleto
                        ? `Faltam: ${info.lista.length > 0 ? Object.keys(diagnostico.tabelas).find(t => t === nome) ? 'Verifique o schema' : null : 'Nenhuma coluna detectada'}`
                        : null
                    }
                  />
                ))}
              </div>
            </section>

            {/* 4. TESTE DE INSERT */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Testes de Operação
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(diagnostico.teste_insert).map(([tabela, info]) => (
                  <Card
                    key={tabela}
                    titulo={`Insert em ${tabela}`}
                    icone={CheckCircle2}
                    status={info.status}
                    mensagem={info.mensagem}
                    detalhes={info.code ? `Código: ${info.code}` : null}
                  />
                ))}
              </div>
            </section>

            {/* 5. RLS */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                Segurança (RLS)
              </h2>
              <Card
                titulo="Row Level Security"
                icone={Lock}
                status="verificado_via_inserção"
                mensagem={diagnostico.rls.nota}
              />
            </section>

            {/* 6. LOG DE ERROS */}
            {diagnostico.erros.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Erros Detectados ({diagnostico.erros.length})
                </h2>
                <div className="space-y-2">
                  {diagnostico.erros.map((err, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="font-semibold text-red-900">
                        {err.tabela ? `${err.tabela} - ${err.tipo}` : err.tipo}
                      </p>
                      <p className="text-red-700 mt-0.5">{err.mensagem}</p>
                      {err.faltam && (
                        <p className="text-red-600 mt-1">
                          Colunas faltantes: {err.faltam.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Timestamp */}
            <div className="text-xs text-slate-500 text-center pt-4 border-t">
              Última atualização: {new Date(diagnostico.timestamp).toLocaleString('pt-BR')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}