import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useSupabaseAuth } from '@/components/context/SupabaseAuthContext';
import { useEmpresa } from '@/components/context/EmpresaContext';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BarChart2, Settings, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CRMCardOportunidade from '@/components/crm/CRMCardOportunidade';
import CRMNovaOportunidadeModal from '@/components/crm/CRMNovaOportunidadeModal';
import CRMConfigModal from '@/components/crm/CRMConfigModal';

const LIMITE = 100;

export default function CRMPage() {
  const { empresa_id } = useEmpresa();
  const { erpUsuario } = useSupabaseAuth();
  const isAdmin = erpUsuario?.perfil === 'Administrador';
  const { showError } = useGlobalAlert();
  const navigate = useNavigate();

  const [etapas, setEtapas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [funil, setFunil] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [mostrarFechados, setMostrarFechados] = useState(false);
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');

  // Modais
  const [showNova, setShowNova] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Drag and drop
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // Ref para controlar carregamento
  const carregandoRef = useRef(false);

  const carregar = async () => {
    if (!empresa_id || !erpUsuario?.id) return;
    if (carregandoRef.current) return;
    carregandoRef.current = true;
    setLoading(true);

    try {
      // 1. Carregar funil e etapas da empresa — crm_funis TEM empresa_id
      const [{ data: funis }, { data: etapasData }] = await Promise.all([
        supabase.from('crm_funis').select('id,nome').eq('empresa_id', empresa_id).is('deleted_at', null).order('created_at'),
        supabase.from('crm_etapas').select('id,nome,ordem,percentual,funil_id')
          .eq('empresa_id', empresa_id)
          .is('deleted_at', null)
          .order('ordem'),
      ]);

      const funilDaEmpresa = (funis || [])[0] || null;
      setFunil(funilDaEmpresa);

      const etapasFiltradas = funilDaEmpresa
        ? (etapasData || []).filter(e => e.funil_id === funilDaEmpresa.id).sort((a, b) => a.ordem - b.ordem)
        : (etapasData || []).sort((a, b) => a.ordem - b.ordem);
      setEtapas(etapasFiltradas);

      // 2. Carregar oportunidades — sem filtro por responsavel_id (campo é null em muitos registros)
      // Filtrar apenas por empresa_id; responsavel_nome já vem desnormalizado
      let query = supabase
        .from('crm_oportunidades')
        .select('id,titulo,valor,etapa_id,status,responsavel_nome,responsavel_id,usuario_id,created_at,cliente_nome,artigo_nome,cor_nome,quantidade')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(LIMITE);

      if (!mostrarFechados) query = query.eq('status', 'aberto');
      // Filtro de vendedor usa usuario_id ou responsavel_id
      if (!isAdmin && erpUsuario?.id) {
        query = query.or(`usuario_id.eq.${erpUsuario.id},responsavel_id.eq.${erpUsuario.id}`);
      } else if (isAdmin && filtroResponsavel !== 'todos') {
        query = query.or(`usuario_id.eq.${filtroResponsavel},responsavel_id.eq.${filtroResponsavel}`);
      }

      const { data: dados, error } = await query;
      if (error) throw new Error(error.message);

      const lista = dados || [];
      setOportunidades(lista);

      // Montar lista de vendedores para filtro admin (usa responsavel_nome desnormalizado)
      if (isAdmin) {
        const usuariosMap = new Map();
        lista.forEach(o => {
          const uid = o.usuario_id || o.responsavel_id;
          if (uid && !usuariosMap.has(uid)) {
            usuariosMap.set(uid, { id: uid, nome: o.responsavel_nome || 'Sem nome' });
          }
        });
        setVendedores([...usuariosMap.values()]);
      }
    } catch (e) {
      showError({ title: 'Erro ao carregar dados', description: e.message });
    } finally {
      setLoading(false);
      carregandoRef.current = false;
    }
  };

  // Dispara apenas quando empresa_id e erpUsuario estiverem prontos
  useEffect(() => {
    if (!empresa_id || !erpUsuario?.id) return;
    carregar();
  }, [empresa_id, erpUsuario?.id, mostrarFechados, filtroResponsavel]);

  // Drag and drop
  const onDragStart = (e, op) => {
    if (op.status !== 'aberto') { e.preventDefault(); return; }
    setDragging(op);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e, etapaId) => { e.preventDefault(); setDragOver(etapaId); };
  const onDrop = async (e, etapa) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging.status !== 'aberto' || dragging.etapa_id === etapa.id) { setDragging(null); return; }
    try {
      await supabase.from('crm_oportunidades').update({ etapa_id: etapa.id, updated_at: new Date().toISOString() }).eq('id', dragging.id);
      await supabase.from('crm_oportunidade_historico').insert({ oportunidade_id: dragging.id, acao: 'mover_etapa', descricao: `Movido para etapa "${etapa.nome}"` });
      setOportunidades(prev => prev.map(o => o.id === dragging.id ? { ...o, etapa_id: etapa.id } : o));
    } catch (err) {
      showError({ title: 'Erro ao mover oportunidade', description: err.message });
    }
    setDragging(null);
  };

  // IDs de etapas válidas (não deletadas) que existem no kanban
  const etapaIds = new Set(etapas.map(e => e.id));

  const opPorEtapa = etapa => {
    let lista;
    if (etapa.__semEtapa) {
      // Oportunidades sem etapa válida (etapa deletada ou null)
      lista = oportunidades.filter(o => !o.etapa_id || !etapaIds.has(o.etapa_id));
    } else {
      lista = oportunidades.filter(o => o.etapa_id === etapa.id);
    }
    if (busca) {
      const b = busca.toLowerCase();
      lista = lista.filter(o => o.titulo?.toLowerCase().includes(b) || o.cliente_nome?.toLowerCase().includes(b));
    }
    return lista;
  };

  // Oportunidades sem etapa válida (etapa foi deletada)
  const opsSemEtapa = oportunidades.filter(o => !o.etapa_id || !etapaIds.has(o.etapa_id));
  const etapasComSemEtapa = opsSemEtapa.length > 0
    ? [...etapas, { id: '__sem_etapa__', nome: 'Sem Etapa', ordem: 9999, percentual: 0, __semEtapa: true }]
    : etapas;

  const totalValor = oportunidades.filter(o => o.status === 'aberto').reduce((s, o) => s + (o.valor || 0), 0);
  const formatVal = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header fixo */}
      <div className="flex-shrink-0 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">CRM — Funil de Vendas</h1>
            <p className="text-sm text-slate-500">
              {oportunidades.filter(o => o.status === 'aberto').length} abertas · {formatVal(totalValor)} em pipeline
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button variant="outline" size="icon" onClick={() => setShowConfig(true)} title="Configurações">
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={carregar} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link to="/CRMRelatoriosPage">
              <Button variant="outline"><BarChart2 className="h-4 w-4 mr-2" /> Relatórios</Button>
            </Link>
            <Button onClick={() => setShowNova(true)} style={{ background: '#3B5CCC' }} className="text-white gap-2">
              <Plus className="h-4 w-4" /> Nova Oportunidade
            </Button>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 w-44" />
          </div>

          {isAdmin && vendedores.length > 0 && (
            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Todos vendedores" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos vendedores</SelectItem>
                {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <button
            onClick={() => setMostrarFechados(p => !p)}
            className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              mostrarFechados ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {mostrarFechados ? '✓ Mostrar fechados' : 'Mostrar fechados'}
          </button>
        </div>
      </div>

      {/* Kanban com scroll lateral */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-4 h-full pb-2">
            {etapasComSemEtapa.map(etapa => {
              const cards = opPorEtapa(etapa);
              const totalEtapa = cards.filter(o => o.status === 'aberto').reduce((s, o) => s + (o.valor || 0), 0);
              return (
                <div
                  key={etapa.id}
                  className={`flex-shrink-0 w-72 rounded-xl border flex flex-col transition-colors ${
                    dragOver === etapa.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'
                  }`}
                  onDragOver={!etapa.__semEtapa ? e => onDragOver(e, etapa.id) : undefined}
                  onDrop={!etapa.__semEtapa ? e => onDrop(e, etapa) : undefined}
                  onDragLeave={() => setDragOver(null)}
                >
                  {/* Cabeçalho coluna */}
                  <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-700">{etapa.nome}</span>
                      <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{cards.length}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{formatVal(totalEtapa)}</p>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                      <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${etapa.percentual || 0}%` }} />
                    </div>
                  </div>

                  {/* Cards com scroll vertical */}
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    {cards.map(op => (
                      <CRMCardOportunidade
                        key={op.id}
                        oportunidade={op}
                        onDragStart={onDragStart}
                        onClick={() => navigate(`/CRMDetalhePage?id=${op.id}`)}
                      />
                    ))}
                    {cards.length === 0 && (
                      <div className="text-center text-slate-400 text-xs py-8">Nenhuma oportunidade</div>
                    )}
                  </div>
                </div>
              );
            })}

            {etapas.length === 0 && (
              <div className="flex items-center justify-center w-full text-slate-400 text-sm">
                Nenhuma etapa configurada. Use o botão de configurações.
              </div>
            )}
          </div>
        )}
      </div>

      {showNova && (
        <CRMNovaOportunidadeModal
          empresaId={empresa_id}
          etapas={etapas}
          funil={funil}
          currentUser={erpUsuario}
          onClose={() => setShowNova(false)}
          onSaved={() => { setShowNova(false); carregar(); }}
        />
      )}

      {showConfig && (
        <CRMConfigModal
          empresaId={empresa_id}
          funil={funil}
          onClose={() => { setShowConfig(false); carregar(); }}
        />
      )}
    </div>
  );
}