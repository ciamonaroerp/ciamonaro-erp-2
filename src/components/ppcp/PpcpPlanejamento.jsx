import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function PpcpPlanejamento() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarPlanejamento();
  }, []);

  const carregarPlanejamento = async () => {
    try {
      const supabase = await getSupabase();

      const { data } = await supabase
        .from("solicitacaoppcp")
        .select("*")
        .eq("status", "Aprovado")
        .is("data_arquivamento", null)
        .order("data_entrega_cliente", { ascending: true });

      setSolicitacoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar planejamento:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = solicitacoes.filter(
    sol =>
      sol.numero_solicitacao.toLowerCase().includes(busca.toLowerCase()) ||
      sol.cliente_nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return <div className="p-4 text-slate-500">Carregando planejamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por número ou cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cronograma */}
      <div className="space-y-3">
        {filtrados.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-slate-500">
              Nenhuma solicitação aprovada encontrada
            </CardContent>
          </Card>
        ) : (
          filtrados.map(sol => (
            <Card key={sol.id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-5 gap-4 items-start">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Solicitação</p>
                    <p className="font-semibold">{sol.numero_solicitacao}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 mb-1">Cliente</p>
                    <p className="font-medium text-sm">{sol.cliente_nome}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 mb-1">Quantidade</p>
                    <p className="font-medium">{sol.quantidade} un.</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 mb-1">Entrega</p>
                    <p className="font-medium">
                      {new Date(sol.data_entrega_cliente).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 mb-1">Detalhes</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="text-xs">
                        {sol.tipo_personalizacao}
                      </Badge>
                      {sol.tipo_personalizacao === "Silkscreen" && (
                        <Badge variant="outline" className="text-xs">
                          {sol.num_cores_silkscreen}c
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sumário */}
      {filtrados.length > 0 && (
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm">Sumário de Produção</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-600 mb-2">Total de Pedidos</p>
              <p className="text-2xl font-bold">{filtrados.length}</p>
            </div>

            <div>
              <p className="text-xs text-slate-600 mb-2">Total de Peças</p>
              <p className="text-2xl font-bold">
                {filtrados.reduce((sum, sol) => sum + sol.quantidade, 0)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-600 mb-2">Próxima Entrega</p>
              <p className="text-lg font-bold">
                {new Date(filtrados[0]?.data_entrega_cliente).toLocaleDateString(
                  "pt-BR"
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}