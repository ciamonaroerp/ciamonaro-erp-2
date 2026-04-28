import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/lib/supabaseClient';
import { useSupabaseAuth } from '@/components/context/SupabaseAuthContext';
import { AlertCircle, CheckCircle2, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const nivelCor = {
  baixo: 'bg-blue-50 text-blue-800 border-blue-200',
  medio: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  alto: 'bg-orange-50 text-orange-800 border-orange-200',
  critico: 'bg-red-50 text-red-800 border-red-200',
};

const statusCor = {
  aberto: 'bg-red-50 text-red-700',
  resolvido: 'bg-green-50 text-green-700',
  ignorado: 'bg-slate-50 text-slate-700',
};

export default function SistemaAlertasPage() {
  const { erpUsuario } = useSupabaseAuth();
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const qc = useQueryClient();

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ['sistema-alertas', filtroTipo, filtroNivel, filtroStatus],
    queryFn: async () => {
      const { data } = await supabase.from('sistema_alertas').select('*').order('created_at', { ascending: false });
      let filtrados = data || [];

      if (filtroTipo) filtrados = filtrados.filter(a => a.tipo === filtroTipo);
      if (filtroNivel) filtrados = filtrados.filter(a => a.nivel === filtroNivel);
      if (filtroStatus) filtrados = filtrados.filter(a => a.status === filtroStatus);

      return filtrados.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    staleTime: 5000,
  });

  const atualizarStatusMutation = useMutation({
    mutationFn: async ({ alertaId, novoStatus, usuarioResolucao }) => {
      const updateData = {
        status: novoStatus,
      };
      if (novoStatus === 'resolvido') {
        updateData.usuario_resolucao = usuarioResolucao;
        updateData.data_resolucao = new Date().toISOString();
      }

      const { error } = await supabase.from('sistema_alertas').update(updateData).eq('id', alertaId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries(['sistema-alertas']);
    },
  });

  const handleResolverAlerta = async (alertaId) => {
    atualizarStatusMutation.mutate({ alertaId, novoStatus: 'resolvido', usuarioResolucao: erpUsuario?.email });
  };

  const alertasFiltrados = busca
    ? alertas.filter(a =>
      a.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      a.tipo?.toLowerCase().includes(busca.toLowerCase())
    )
    : alertas;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Monitoramento de Alertas</h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe inconsistências e erros silenciosos do sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Buscar por descrição ou tipo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-slate-50"
          />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="bg-slate-50">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos os tipos</SelectItem>
              <SelectItem value="dados_invalidos">Dados Inválidos</SelectItem>
              <SelectItem value="inconsistencia">Inconsistência</SelectItem>
              <SelectItem value="falta_integracao">Falta Integração</SelectItem>
              <SelectItem value="erro_calculo">Erro de Cálculo</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroNivel} onValueChange={setFiltroNivel}>
            <SelectTrigger className="bg-slate-50">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos os níveis</SelectItem>
              <SelectItem value="baixo">Baixo</SelectItem>
              <SelectItem value="medio">Médio</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="bg-slate-50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos os status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="ignorado">Ignorado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-slate-400">Carregando alertas...</div>
          </div>
        ) : alertasFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="text-slate-700 font-medium">Sem alertas</p>
              <p className="text-sm text-slate-500">Sistema operando normalmente</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Nível</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Ação</th>
                </tr>
              </thead>
              <tbody>
                {alertasFiltrados.map((alerta) => (
                  <tr key={alerta.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{alerta.tipo}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{alerta.descricao}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', nivelCor[alerta.nivel])}>
                        {alerta.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusCor[alerta.status])}>
                        {alerta.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {alerta.created_at ? new Date(alerta.created_at).toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {alerta.status === 'aberto' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolverAlerta(alerta.id)}
                          className="text-slate-400 hover:text-slate-600"
                          disabled={atualizarStatusMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: alertas.length, cor: 'slate' },
          { label: 'Críticos', value: alertas.filter(a => a.nivel === 'critico').length, cor: 'red' },
          { label: 'Altos', value: alertas.filter(a => a.nivel === 'alto').length, cor: 'orange' },
          { label: 'Abertos', value: alertas.filter(a => a.status === 'aberto').length, cor: 'yellow' },
        ].map(({ label, value, cor }) => (
          <div key={label} className={`bg-${cor}-50 border border-${cor}-200 rounded-xl p-4`}>
            <p className={`text-xs font-medium text-${cor}-600 uppercase tracking-wide`}>{label}</p>
            <p className={`text-2xl font-bold text-${cor}-800 mt-2`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}