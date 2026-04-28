import { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useSupabaseAuth } from '@/components/context/SupabaseAuthContext';

const localDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Hook que retorna contagem de tarefas atrasadas e de hoje para o usuário logado.
 * Atualiza a cada 5 minutos.
 */
export function useCRMTarefasAlert() {
  const { erpUsuario } = useSupabaseAuth();
  const [atrasadas, setAtrasadas] = useState(0);
  const [hoje, setHoje] = useState(0);

  const carregar = async () => {
    if (!erpUsuario?.id || !supabase) return;
    try {
      const { data } = await supabase
        .from('crm_tarefas')
        .select('id,data_execucao,status')
        .eq('responsavel_id', erpUsuario.id)
        .eq('status', 'pendente')
        .limit(200);

      const tarefas = data || [];
      const t = localDateStr();
      setAtrasadas(tarefas.filter(x => x.data_execucao?.substring(0, 10) < t).length);
      setHoje(tarefas.filter(x => x.data_execucao?.substring(0, 10) === t).length);
    } catch {
      // silencia — não crítico
    }
  };

  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [erpUsuario?.id]);

  return { atrasadas, hoje, total: atrasadas + hoje };
}