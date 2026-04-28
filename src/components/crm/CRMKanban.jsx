import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/lib/supabaseClient';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import CRMCardOportunidade from './CRMCardOportunidade';
import CRMDetalhesModal from './CRMDetalhesModal';

export default function CRMKanban({ etapas, oportunidades, empresaId, onRefresh }) {
  const { showError } = useGlobalAlert();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [selected, setSelected] = useState(null);

  const opPorEtapa = etapa =>
    oportunidades.filter(o => o.etapa_id === etapa.id);

  const totalEtapa = etapa =>
    opPorEtapa(etapa).reduce((s, o) => s + (o.valor || 0), 0);

  const formatVal = v =>
    v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  const onDragStart = (e, op) => {
    setDragging(op);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, etapaId) => {
    e.preventDefault();
    setDragOver(etapaId);
  };

  const onDrop = async (e, etapa) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging.etapa_id === etapa.id) { setDragging(null); return; }

    try {
      await supabase.from('crm_oportunidades').update({ etapa_id: etapa.id, updated_at: new Date().toISOString() }).eq('id', dragging.id);
      await supabase.from('crm_oportunidade_historico').insert({ oportunidade_id: dragging.id, acao: 'mover_etapa', descricao: `Movido para etapa "${etapa.nome}"` });

      onRefresh();
    } catch (err) {
      showError({ title: 'Erro ao mover oportunidade', description: err.message });
    }
    setDragging(null);
  };

  return (
    <>
      <div className="flex gap-4 pb-4 min-h-[500px]">
        {etapas.map(etapa => {
          const cards = opPorEtapa(etapa);
          return (
            <div
              key={etapa.id}
              className={`flex-shrink-0 w-72 rounded-xl border flex flex-col transition-colors ${
                dragOver === etapa.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'
              }`}
              onDragOver={e => onDragOver(e, etapa.id)}
              onDrop={e => onDrop(e, etapa)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Cabeçalho da etapa */}
              <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-700">{etapa.nome}</span>
                  <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {cards.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{formatVal(totalEtapa(etapa))}</p>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                  <div
                    className="bg-blue-500 h-1 rounded-full"
                    style={{ width: `${etapa.percentual}%` }}
                  />
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[600px]">
                {cards.map(op => (
                  <CRMCardOportunidade
                    key={op.id}
                    oportunidade={op}
                    onDragStart={onDragStart}
                    onClick={() => navigate(`/CRMDetalhePage?id=${op.id}`)}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="text-center text-slate-400 text-xs py-8">
                    Nenhuma oportunidade
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </>
  );
}