import { useEffect, useState } from 'react';
import { supabase } from '@/components/lib/supabaseClient';

export default function InformacoesOrcamentoSection({ itens = [] }) {
  const [complementares, setComplementares] = useState([]);
  const [comerciais, setComerciais] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInformacoes = async () => {
      try {
        const [complResult, comResult] = await Promise.all([
          supabase.from('informacoes_complementares').select('id,titulo,descricao').is('deleted_at', null),
          supabase.from('informacoes_condicoes_comerciais').select('id,sequencia,descricao').is('deleted_at', null).order('sequencia', { ascending: true }),
        ]);

        setComplementares(complResult.data || []);
        setComerciais((comResult.data || []).sort((a, b) => (a.sequencia || 0) - (b.sequencia || 0)));
      } catch (error) {
        console.error('Erro ao carregar informações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInformacoes();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Carregando informações...</div>;
  }

  const temProdutoServico = itens.some(i => i.tipo_item === 'Produto e Serviço');
  const complementaresVisiveis = temProdutoServico ? complementares : [];
  const hasData = complementaresVisiveis.length > 0 || comerciais.length > 0;
  if (!hasData) return null;

  return (
    <div className="space-y-6">
      {complementaresVisiveis.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-900 mb-3">
            Informação complementar:
          </h3>
          <div className="space-y-4">
            {complementaresVisiveis.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-semibold text-slate-900">
                  {item.titulo}
                </p>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                  {item.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {comerciais.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-900 mb-3">
            Condições comerciais:
          </h3>
          <div className="space-y-2">
            {comerciais.map((item, idx) => (
              <p key={item.id} className="text-sm text-slate-700">
                {String(idx + 1).padStart(2, '0')} - {item.descricao}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}