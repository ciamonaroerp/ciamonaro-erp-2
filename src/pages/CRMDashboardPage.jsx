import { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useSupabaseAuth } from '@/components/context/SupabaseAuthContext';
import { useEmpresa } from '@/components/context/EmpresaContext';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { TrendingUp, CheckCircle2, Target, DollarSign, AlertCircle, Clock, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = v => {
  if (!v) return 'R$ 0,00';
  if (v >= 1_000_000) return 'R$ ' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return 'R$ ' + (v / 1_000).toFixed(0) + 'K';
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const todayStr = () => new Date().toISOString().split('T')[0];

export default function CRMDashboardPage() {
  const { showError } = useGlobalAlert();
  const { erpUsuario } = useSupabaseAuth();
  const { empresa_id } = useEmpresa();
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [motivosPerda, setMotivosPerda] = useState([]);
  const [tarefas, setTarefas] = useState([]);

  const isAdmin = erpUsuario?.perfil === 'Administrador' ||
    String(erpUsuario?.setor || '').toLowerCase() === 'administrativo';

  useEffect(() => {
    if (!empresa_id || !erpUsuario?.id) return;

    const carregar = async () => {
      setLoading(true);
      try {
        let opsQuery = supabase.from('crm_oportunidades')
          .select('id,titulo,valor,status,responsavel_nome,responsavel_id,motivo_perda_nome,etapa_id,created_at')
          .eq('empresa_id', empresa_id);
        if (!isAdmin && erpUsuario?.id) opsQuery = opsQuery.eq('responsavel_id', erpUsuario.id);

        const queries = [
          opsQuery,
          supabase.from('crm_etapas').select('id,nome,ordem,percentual').eq('empresa_id', empresa_id).is('deleted_at', null).order('ordem'),
          supabase.from('crm_motivos_perda').select('id,nome').eq('empresa_id', empresa_id).is('deleted_at', null),
          supabase.from('crm_tarefas').select('id,data_execucao,status').eq('responsavel_id', erpUsuario.id).eq('status', 'pendente').limit(200),
        ];

        const [opsRes, etapasRes, motivosRes, tarefasRes] = await Promise.all(queries);
        setOps(opsRes.data || []);
        setEtapas(etapasRes.data || []);
        setMotivosPerda(motivosRes.data || []);
        setTarefas(tarefasRes?.data || []);
      } catch (e) {
        showError({ title: 'Erro ao carregar dashboard', description: e.message });
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [empresa_id, erpUsuario?.id, isAdmin]);

  // Indicadores
  const abertas = ops.filter(o => o.status === 'aberto');
  const ganhas = ops.filter(o => o.status === 'ganho');
  const perdidas = ops.filter(o => o.status === 'perdido');
  const total = ops.length;

  const pipeline = abertas.reduce((s, o) => s + (o.valor || 0), 0);
  const totalGanho = ganhas.reduce((s, o) => s + (o.valor || 0), 0);
  const taxaConversao = pct(ganhas.length, ganhas.length + perdidas.length);
  const ticketMedio = ganhas.length > 0 ? totalGanho / ganhas.length : 0;

  // Por vendedor
  const porVendedor = {};
  ops.forEach(o => {
    const v = o.responsavel_nome || 'Sem responsável';
    if (!porVendedor[v]) porVendedor[v] = { abertas: 0, ganhas: 0, perdidas: 0, pipeline: 0, ganho: 0 };
    if (o.status === 'aberto') { porVendedor[v].abertas++; porVendedor[v].pipeline += o.valor || 0; }
    if (o.status === 'ganho') { porVendedor[v].ganhas++; porVendedor[v].ganho += o.valor || 0; }
    if (o.status === 'perdido') porVendedor[v].perdidas++;
  });

  // Por etapa
  const porEtapa = {};
  etapas.forEach(e => { porEtapa[e.id] = { nome: e.nome, count: 0, valor: 0 }; });
  abertas.forEach(o => {
    if (o.etapa_id && porEtapa[o.etapa_id]) {
      porEtapa[o.etapa_id].count++;
      porEtapa[o.etapa_id].valor += o.valor || 0;
    }
  });
  const etapasList = Object.values(porEtapa).filter(e => e.count > 0);

  // Motivos de perda
  const perdaPorMotivo = {};
  perdidas.forEach(o => {
    const m = o.motivo_perda_nome || 'Não informado';
    perdaPorMotivo[m] = (perdaPorMotivo[m] || 0) + 1;
  });
  const motivosList = Object.entries(perdaPorMotivo).sort((a, b) => b[1] - a[1]);

  const t = todayStr();
  const tarefasAtrasadas = tarefas.filter(x => x.data_execucao?.split('T')[0] < t).length;
  const tarefasHoje = tarefas.filter(x => x.data_execucao?.split('T')[0] === t).length;
  const tarefasPendentes = tarefas.length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard CRM</h1>
        <p className="text-sm text-slate-500 mt-0.5">Indicadores comerciais · {total} oportunidades</p>
      </div>

      {/* Cards pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600"
          label="Pipeline" value={fmt(pipeline)} sub={`${abertas.length} em aberto`} />
        <StatCard icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600"
          label="Ganhos" value={fmt(totalGanho)} sub={`${ganhas.length} negócios`} />
        <StatCard icon={Target} iconBg="bg-amber-50" iconColor="text-amber-600"
          label="Tx. Conversão" value={taxaConversao} sub={`${perdidas.length} perdidas`} />
        <StatCard icon={DollarSign} iconBg="bg-violet-50" iconColor="text-violet-600"
          label="Ticket Médio" value={fmt(ticketMedio)} sub="negócios ganhos" />
      </div>

      {/* Cards de tarefas */}
      <div className="grid grid-cols-3 gap-4">
        <Link to="/CRMTarefasPage" className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="h-11 w-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Atrasadas</p>
            <p className="text-2xl font-bold text-red-700">{tarefasAtrasadas}</p>
            <p className="text-xs text-red-400">tarefas pendentes</p>
          </div>
        </Link>
        <Link to="/CRMTarefasPage" className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wide">Hoje</p>
            <p className="text-2xl font-bold text-amber-700">{tarefasHoje}</p>
            <p className="text-xs text-amber-400">para executar</p>
          </div>
        </Link>
        <Link to="/CRMTarefasPage" className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="h-11 w-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Total Pendentes</p>
            <p className="text-2xl font-bold text-blue-700">{tarefasPendentes}</p>
            <p className="text-xs text-blue-400">no funil</p>
          </div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Por vendedor */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Por Vendedor</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-2 md:px-3 py-1.5 text-left">Vendedor</th>
                  <th className="px-2 md:px-3 py-1.5 text-right">Abertas</th>
                  <th className="px-2 md:px-3 py-1.5 text-right">Ganhas</th>
                  <th className="px-2 md:px-3 py-1.5 text-right">Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(porVendedor).sort((a, b) => b[1].pipeline - a[1].pipeline).map(([nome, d]) => (
                  <tr key={nome} className="hover:bg-slate-50">
                    <td className="px-2 md:px-3 py-2 font-medium text-slate-800 truncate">{nome}</td>
                    <td className="px-2 md:px-3 py-2 text-right text-slate-600">{d.abertas}</td>
                    <td className="px-2 md:px-3 py-2 text-right text-green-600 font-medium">{d.ganhas}</td>
                    <td className="px-2 md:px-3 py-2 text-right text-slate-700 font-medium">{fmt(d.pipeline)}</td>
                  </tr>
                ))}
                {Object.keys(porVendedor).length === 0 && (
                  <tr><td colSpan={4} className="px-2 md:px-3 py-4 text-center text-slate-400">Sem dados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Por etapa */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Por Etapa</h2>
          </div>
          <div className="p-4 space-y-3">
            {etapasList.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sem oportunidades abertas</p>}
            {etapasList.map(e => (
              <div key={e.nome} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{e.nome}</span>
                    <span className="text-slate-500">{e.count} · {fmt(e.valor)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${pipeline > 0 ? (e.valor / pipeline) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivos de perda */}
      {motivosList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Motivos de Perda</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {motivosList.map(([nome, count]) => (
              <div key={nome} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-sm">
                <span className="text-red-700 font-medium">{nome}</span>
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}