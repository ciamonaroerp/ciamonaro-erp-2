import { DollarSign, User, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formatVal = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '—';
const formatDate = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const STATUS_BADGE = {
  ganho: <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">Ganho</Badge>,
  perdido: <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">Perdido</Badge>,
};

export default function CRMCardOportunidade({ oportunidade, onDragStart, onClick }) {
  const fechado = oportunidade.status !== 'aberto';
  const whatsapp = oportunidade.telefone_cliente
    ? `https://wa.me/55${oportunidade.telefone_cliente.replace(/\D/g, '')}`
    : null;

  return (
    <div
      className={`bg-white rounded-lg border p-3 select-none transition-all ${
        fechado
          ? 'border-slate-200 opacity-75 cursor-default'
          : 'border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300'
      }`}
      draggable={!fechado}
      onDragStart={e => onDragStart(e, oportunidade)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="font-semibold text-sm text-slate-800 leading-tight flex-1">{oportunidade.titulo}</p>
        {fechado && STATUS_BADGE[oportunidade.status]}
      </div>

      {(oportunidade.artigo_nome || oportunidade.cor_nome || oportunidade.quantidade) && (
        <p className="text-xs text-slate-500 mb-2">
          {[oportunidade.artigo_nome, oportunidade.cor_nome, oportunidade.quantidade ? `${oportunidade.quantidade} un.` : null]
            .filter(Boolean).join(' · ')}
        </p>
      )}

      {oportunidade.cliente_nome && (
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
          <User className="h-3 w-3" />
          <span className="truncate">{oportunidade.cliente_nome}</span>
        </div>
      )}

      {oportunidade.valor > 0 && (
        <div className="flex items-center gap-1 text-xs text-green-600 font-medium mb-1">
          <DollarSign className="h-3 w-3" />
          <span>{formatVal(oportunidade.valor)}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">{formatDate(oportunidade.created_at)}</span>
        <div className="flex items-center gap-1">
          {oportunidade.responsavel_nome && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[80px]">
              {oportunidade.responsavel_nome.split(' ')[0]}
            </span>
          )}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1 rounded hover:bg-green-50 text-green-600 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}