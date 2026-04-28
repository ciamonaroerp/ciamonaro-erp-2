import { useCallback } from 'react';
import { supabase } from '@/components/lib/supabaseClient';

/**
 * Hook para registro silencioso do histórico de preços ao fluxo de importação XML.
 * NÃO altera o fluxo principal. NÃO bloqueia operações.
 */
export function useHistoricoPrecoIntegration() {
  const registrarHistoricoParaItem = useCallback(async (item, vinculo, contexto) => {
    if (!item || !contexto?.empresa_id || !supabase) return;

    const registro = {
      empresa_id: contexto.empresa_id,
      codigo_unico: vinculo?.codigo_unico || null,
      codigo_produto: vinculo?.codigo_produto || null,
      chave_danfe: contexto.chave_danfe || null,
      valor_unitario: item.valor_unitario || null,
      quantidade: item.quantidade || null,
      data_emissao: contexto.data_emissao || null,
    };

    supabase.from('historico_precos').insert(registro).then(({ error }) => {
      if (error) console.warn('[historicoPreco] Falha ao registrar:', error.message);
    });
  }, []);

  return { registrarHistoricoParaItem };
}