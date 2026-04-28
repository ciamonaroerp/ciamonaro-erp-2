import { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useEmpresa } from '@/components/context/EmpresaContext';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Target, Users, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CRMRelatoriosPage() {
  const { empresa_id } = useEmpresa();
  const { showError } = useGlobalAlert();

  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresa_id) return;
    setLoading(true);
    supabase.from('crm_oportunidades').select('id,titulo,valor,status,responsavel_nome,motivo_perda_nome,etapa_id,created_at').eq('empresa_id', empresa_id)
      .then(({ data }) => setOportunidades(data || []))
      .catch(e => showError({ title: 'Erro', description: e.message }))
      .finally(() => setLoading(false));
  }, [empresa_id]);

  const total = oportunidades.length;
  const ganhos = oportunidades.filter(o => o.status === 'ganho');
  const perdidos = oportunidades.filter(o => o.status === 'perdido');
  const abertos = oportunidades.filter(o => o.status === 'aberto');
  const taxaConversao = total > 0 ? ((ganhos.length / total) * 100).toFixed(1) : 0;
  const valorPipeline = abertos.reduce((s, o) => s + (o.valor || 0), 0);
  const valorGanho = ganhos.reduce((s, o) => s + (o.valor || 0), 0);

  const formatVal = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  // Ranking por vendedor
  const rankingVendedores = Object.values(
    oportunidades.reduce((acc, o) => {
      const nome = o.responsavel_nome || 'Sem responsável';
      if (!acc[nome]) acc[nome] = { nome, total: 0, ganhos: 0, valor: 0 };
      acc[nome].total++;
      if (o.status === 'ganho') { acc[nome].ganhos++; acc[nome].valor += o.valor || 0; }
      return acc;
    }, {})
  ).sort((a, b) => b.valor - a.valor);

  // Motivos de perda
  const motivosPerda = Object.values(
    perdidos.reduce((acc, o) => {
      const m = o.motivo_perda_nome || 'Não informado';
      if (!acc[m]) acc[m] = { nome: m, total: 0 };
      acc[m].total++;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/CRMPage">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios CRM</h1>
          <p className="text-sm text-slate-500">Visão gerencial do pipeline de vendas</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Pipeline Total" value={formatVal(valorPipeline)} color="bg-blue-100 text-blue-600" />
            <StatCard icon={Target} label="Taxa de Conversão" value={`${taxaConversao}%`} color="bg-green-100 text-green-600" />
            <StatCard icon={Target} label="Valor Ganho" value={formatVal(valorGanho)} color="bg-emerald-100 text-emerald-600" />
            <StatCard icon={XCircle} label="Perdidas" value={perdidos.length} color="bg-red-100 text-red-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking vendedores */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" /> Ranking de Vendedores
              </h2>
              {rankingVendedores.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {rankingVendedores.map((v, i) => (
                    <div key={v.nome} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5">{i + 1}º</span>
                        <span className="text-sm font-medium text-slate-700">{v.nome}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-600 font-semibold">{formatVal(v.valor)}</p>
                        <p className="text-xs text-slate-400">{v.ganhos}/{v.total} conversões</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Motivos de perda */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" /> Motivos de Perda
              </h2>
              {motivosPerda.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma perda registrada</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={motivosPerda} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#ef4444" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Resumo status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">Distribuição por Status</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Abertos', count: abertos.length, color: 'text-blue-600 bg-blue-50' },
                { label: 'Ganhos', count: ganhos.length, color: 'text-green-600 bg-green-50' },
                { label: 'Perdidos', count: perdidos.length, color: 'text-red-600 bg-red-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                  <p className="text-3xl font-bold">{s.count}</p>
                  <p className="text-sm font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}