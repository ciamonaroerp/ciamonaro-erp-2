import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";

export function useOrcamentoItens(orcamentoId) {
  return useQuery({
    queryKey: ["orcamento-itens", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId || !supabase) return [];
      const { data, error } = await supabase
        .from("orcamento_itens")
        .select("*")
        .eq("orcamento_id", orcamentoId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!orcamentoId,
    staleTime: 0,
  });
}

export function useInvalidateOrcamentoItens() {
  const qc = useQueryClient();
  return (orcamentoId) => {
    qc.invalidateQueries(["orcamento-itens", orcamentoId]);
  };
}