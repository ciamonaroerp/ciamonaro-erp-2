import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/components/lib/supabaseClient";
import { Wrench, Clock } from "lucide-react";

function ReadField({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[36px]">
        {value || <span className="text-slate-400 italic">Sem informação</span>}
      </p>
    </div>
  );
}

export default function ClienteDetalhesTecnicosTab({ clienteId }) {
  const { data: detalhes, isLoading } = useQuery({
    queryKey: ["clientes_detalhes_tecnicos", clienteId],
    queryFn: async () => {
      const client = await getSupabase();
      const { data } = await client
        .from("clientes_detalhes_tecnicos")
        .select("*")
        .eq("cliente_id", clienteId)
        .maybeSingle();
      return data;
    },
    enabled: !!clienteId,
  });

  if (isLoading) {
    return <p className="text-sm text-slate-400 py-4 text-center">Carregando...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Clock className="h-4 w-4 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700">
          Esses campos serão alimentados automaticamente pelo módulo PPCP. Somente leitura neste módulo.
        </p>
      </div>

      {!detalhes ? (
        <div className="text-center py-10 text-slate-400">
          <Wrench className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Nenhum detalhe técnico registrado</p>
          <p className="text-xs mt-1">As informações serão preenchidas pelo módulo PPCP</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ReadField label="Padrão de modelagens" value={detalhes.padrao_modelagens} />
            <ReadField label="Requisitos de produção" value={detalhes.requisitos_producao} />
          </div>
          <ReadField label="Ocorrências de qualidade" value={detalhes.ocorrencias_qualidade} />
          <ReadField label="Observações técnicas" value={detalhes.observacoes_tecnicas} />
          <ReadField label="Histórico técnico" value={detalhes.historico_tecnico} />
          {detalhes.updated_at && (
            <p className="text-xs text-slate-400 text-right">
              Última atualização: {new Date(detalhes.updated_at).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}