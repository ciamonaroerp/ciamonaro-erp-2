import React, { useState, useEffect } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import { X, Archive, Plus, Trash2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ChatInterno from "@/components/comercial/ChatInterno";

export default function LogisticaDetalhes({
  solicitacao,
  onClose,
  onStatusChange,
  onArquivar,
  usuarioAtual,
  onRefresh,
}) {
  const [expandedSection, setExpandedSection] = useState("detalhes");
  const [cotacoes, setCotacoes] = useState([]);
  const [novaCotacao, setNovaCotacao] = useState({
    numero_cotacao: "",
    transportadora: "",
    modalidade: "Rodoviário",
    prazo_entrega: "",
    valor: "",
    quantidade_volumes: "",
    peso_total: "",
    observacoes: "",
  });
  const [adicionandoCotacao, setAdicionandoCotacao] = useState(false);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState(null);
  useEffect(() => {
    carregarCotacoes();
  }, [solicitacao.id]);

  const carregarCotacoes = async () => {
    try {
      const { data } = await supabase.from("cotacoes_frete").select("*").eq("solicitacao_frete_id", solicitacao.id).order("created_date", { ascending: false });
      setCotacoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar cotações:", error);
    }
  };

  const adicionarCotacao = async () => {
    if (!novaCotacao.numero_cotacao || !novaCotacao.transportadora || !novaCotacao.valor) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    try {
      const { error } = await supabase.from("cotacoes_frete").insert([
        {
          solicitacao_frete_id: solicitacao.id,
          numero_cotacao_sistema: `COT-${Date.now()}`,
          numero_cotacao_transportadora: novaCotacao.numero_cotacao,
          transportadora: novaCotacao.transportadora,
          modalidade: novaCotacao.modalidade,
          prazo_entrega: novaCotacao.prazo_entrega,
          valor: parseFloat(novaCotacao.valor),
          quantidade_volumes: parseInt(novaCotacao.quantidade_volumes) || null,
          peso_total: parseFloat(novaCotacao.peso_total) || null,
          observacoes: novaCotacao.observacoes,
          data_criacao: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setNovaCotacao({
        numero_cotacao: "",
        transportadora: "",
        modalidade: "Rodoviário",
        prazo_entrega: "",
        valor: "",
        quantidade_volumes: "",
        peso_total: "",
        observacoes: "",
      });
      setAdicionandoCotacao(false);
      await carregarCotacoes();
    } catch (error) {
      console.error("Erro ao adicionar cotação:", error);
      alert("Erro ao adicionar cotação");
    }
  };

  const selecionarCotacao = async (cotacao) => {
    try {
      await supabase.from("solicitacaofrete").update({ status: "Concluído" }).eq("id", solicitacao.id);

      onStatusChange(solicitacao, "Concluído");
      onRefresh();
    } catch (error) {
      console.error("Erro ao selecionar cotação:", error);
      alert("Erro ao selecionar cotação");
    }
  };

  const deletarCotacao = async (cotacao) => {
    if (!window.confirm("Tem certeza que deseja deletar esta cotação?")) return;

    try {
      await supabase.from("cotacoes_frete").delete().eq("id", cotacao.id);

      await carregarCotacoes();
    } catch (error) {
      console.error("Erro ao deletar cotação:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-white z-10 flex flex-row items-center justify-between">
          <CardTitle>{solicitacao.numero_solicitacao}</CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Abas */}
          <div className="flex gap-2 border-b">
            {["detalhes", "cotacoes", "chat", "acoes"].map(tab => (
              <button
                key={tab}
                onClick={() => setExpandedSection(tab)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  expandedSection === tab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "detalhes"
                  ? "Detalhes"
                  : tab === "cotacoes"
                  ? "Cotações"
                  : tab === "chat"
                  ? "Chat"
                  : "Ações"}
              </button>
            ))}
          </div>

          {/* Detalhes */}
          {expandedSection === "detalhes" && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Status</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {solicitacao.status}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Cliente</p>
                  <p className="font-medium">{solicitacao.cliente_nome}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">CEP Destino</p>
                  <p className="font-medium">{solicitacao.cep_destino}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Data de Entrega</p>
                  <p className="font-medium">
                    {new Date(solicitacao.data_entrega).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Quantidade de Camisetas</p>
                  <p className="font-medium">{solicitacao.quantidade_camisetas}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Valor da Mercadoria</p>
                  <p className="font-medium">
                    R$ {parseFloat(solicitacao.valor_mercadoria || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Vendedor</p>
                  <p className="text-sm font-medium">{solicitacao.vendedor_email}</p>
                </div>

                {solicitacao.observacoes_vendedor && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Observações</p>
                    <p className="text-sm">{solicitacao.observacoes_vendedor}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cotações */}
          {expandedSection === "cotacoes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Cotações Recebidas</h3>
                {!adicionandoCotacao && solicitacao.status !== "Concluído" && (
                  <Button
                    onClick={() => setAdicionandoCotacao(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Cotação
                  </Button>
                )}
              </div>

              {adicionandoCotacao && (
                <Card className="bg-slate-50 p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Nº cotação transportadora"
                        value={novaCotacao.numero_cotacao}
                        onChange={e =>
                          setNovaCotacao(p => ({
                            ...p,
                            numero_cotacao: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Transportadora"
                        value={novaCotacao.transportadora}
                        onChange={e =>
                          setNovaCotacao(p => ({
                            ...p,
                            transportadora: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Select
                        value={novaCotacao.modalidade}
                        onValueChange={value =>
                          setNovaCotacao(p => ({ ...p, modalidade: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rodoviário">Rodoviário</SelectItem>
                          <SelectItem value="Aéreo">Aéreo</SelectItem>
                          <SelectItem value="Marítimo">Marítimo</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        placeholder="Prazo (dias)"
                        value={novaCotacao.prazo_entrega}
                        onChange={e =>
                          setNovaCotacao(p => ({
                            ...p,
                            prazo_entrega: e.target.value,
                          }))
                        }
                      />

                      <Input
                        type="number"
                        placeholder="Valor"
                        value={novaCotacao.valor}
                        onChange={e =>
                          setNovaCotacao(p => ({
                            ...p,
                            valor: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        placeholder="Volumes"
                        value={novaCotacao.quantidade_volumes}
                        onChange={e =>
                          setNovaCotacao(p => ({
                            ...p,
                            quantidade_volumes: e.target.value,
                          }))
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Peso total (kg)"
                        value={novaCotacao.peso_total}
                        onChange={e =>
                          setNovaCotacao(p => ({
                            ...p,
                            peso_total: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Textarea
                      placeholder="Observações"
                      value={novaCotacao.observacoes}
                      onChange={e =>
                        setNovaCotacao(p => ({
                          ...p,
                          observacoes: e.target.value,
                        }))
                      }
                      className="min-h-20"
                    />

                    <div className="flex gap-2">
                      <Button
                        onClick={adicionarCotacao}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Adicionar
                      </Button>
                      <Button
                        onClick={() => setAdicionandoCotacao(false)}
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <div className="space-y-3">
                {cotacoes.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Nenhuma cotação adicionada
                  </p>
                ) : (
                  cotacoes.map(cotacao => (
                    <Card
                      key={cotacao.id}
                      className={`cursor-pointer transition-all ${
                        cotacao.id === cotacaoSelecionada?.id
                          ? "border-2 border-green-500 bg-green-50"
                          : ""
                      }`}
                      onClick={() => {
                        if (solicitacao.status !== "Concluído") {
                          setCotacaoSelecionada(cotacao);
                        }
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {cotacao.transportadora}
                              </p>
                              <p className="text-xs text-slate-600">
                                {cotacao.numero_cotacao_sistema} - {cotacao.numero_cotacao_transportadora}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">
                                R$ {parseFloat(cotacao.valor).toFixed(2)}
                              </p>
                              <p className="text-xs text-slate-600">
                                {cotacao.prazo_entrega} dias
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-slate-600">Modalidade</p>
                              <p className="font-medium">{cotacao.modalidade}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Volumes</p>
                              <p className="font-medium">{cotacao.quantidade_volumes || "—"}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Peso</p>
                              <p className="font-medium">
                                {cotacao.peso_total ? `${cotacao.peso_total} kg` : "—"}
                              </p>
                            </div>
                          </div>

                          {cotacao.observacoes && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                              {cotacao.observacoes}
                            </p>
                          )}

                          <p className="text-xs text-slate-500">
                            {new Date(cotacao.created_date).toLocaleDateString("pt-BR")}{" "}
                            às{" "}
                            {new Date(cotacao.created_date).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>

                          <div className="flex gap-2">
                            {solicitacao.status !== "Concluído" && (
                              <Button
                                onClick={() => selecionarCotacao(cotacao)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Selecionar
                              </Button>
                            )}
                            <Button
                              onClick={() => deletarCotacao(cotacao)}
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Deletar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chat */}
          {expandedSection === "chat" && (
            <ChatInterno
              solicitacaoId={solicitacao.id}
              tipo="Frete"
              statusAtual={solicitacao.status}
              usuarioEmail={usuarioAtual?.email}
              usuarioNome={usuarioAtual?.full_name}
              onMessageAdded={onRefresh}
            />
          )}

          {/* Ações */}
          {expandedSection === "acoes" && (
            <div className="space-y-4">
              {!["Concluído"].includes(solicitacao.status) && (
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => onStatusChange(solicitacao, "Em análise")}
                    variant="outline"
                  >
                    Em análise
                  </Button>

                  <Button
                    onClick={() => onStatusChange(solicitacao, "Ajustes")}
                    variant="outline"
                  >
                    Ajustes
                  </Button>
                </div>
              )}

              {["Concluído"].includes(solicitacao.status) && (
                <Button
                  onClick={() => onArquivar(solicitacao)}
                  className="gap-2 w-full"
                  variant="outline"
                >
                  <Archive className="h-4 w-4" />
                  Arquivar Solicitação
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}