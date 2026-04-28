import React, { useState, useEffect } from "react";
import { supabase } from "@/components/lib/supabaseClient";
import {
  X,
  Send,
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChatInterno from "@/components/comercial/ChatInterno";

export default function PpcpDetalhes({
  solicitacao,
  onClose,
  onStatusChange,
  onArquivar,
  usuarioAtual,
  onRefresh,
}) {
  const [expandedSection, setExpandedSection] = useState("detalhes");
  const [validadeAprovacao, setValidadeAprovacao] = useState("24h");
  const [mostrarCampoValidade, setMostrarCampoValidade] = useState(false);

  const handleAprovacao = async () => {
    if (!validadeAprovacao) {
      alert("Selecione a validade da aprovação");
      return;
    }

    const dataAprovacao = new Date();
    const dataExpiracao = new Date(dataAprovacao);
    const horasValidade = parseInt(validadeAprovacao);
    dataExpiracao.setHours(dataExpiracao.getHours() + horasValidade);

    try {
      await supabase
        .from("solicitacaoppcp")
        .update({
          status: "Aprovado",
          data_aprovacao: dataAprovacao.toISOString(),
          validade_aprovacao: validadeAprovacao,
        })
        .eq("id", solicitacao.id);

      onStatusChange(solicitacao, "Aprovado");
      setMostrarCampoValidade(false);
      setValidadeAprovacao("24h");
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      alert("Erro ao aprovar solicitação");
    }
  };

  const handleRejeicao = async () => {
    if (
      !window.confirm("Tem certeza que deseja rejeitar esta solicitação?")
    ) {
      return;
    }

    try {
      await supabase
        .from("solicitacaoppcp")
        .update({ status: "Reprovado" })
        .eq("id", solicitacao.id);

      onStatusChange(solicitacao, "Reprovado");
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
      alert("Erro ao rejeitar solicitação");
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
            {["detalhes", "chat", "acoes"].map(tab => (
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
                  : tab === "chat"
                  ? "Chat Interno"
                  : "Ações"}
              </button>
            ))}
          </div>

          {/* Aba Detalhes */}
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
                  <p className="text-xs text-slate-600 mb-1">Artigo/Tecido</p>
                  <p className="font-medium">{solicitacao.artigo}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Cor</p>
                  <p className="font-medium">{solicitacao.cor}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Modelo</p>
                  <p className="font-medium">{solicitacao.modelo}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Quantidade</p>
                  <p className="font-medium">{solicitacao.quantidade} unidades</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Personalização</p>
                  <p className="font-medium">{solicitacao.tipo_personalizacao}</p>
                </div>

                {solicitacao.tipo_personalizacao === "Silkscreen" && (
                  <div className="space-y-2 bg-slate-50 p-3 rounded">
                    <p className="text-xs text-slate-600">
                      Cores: {solicitacao.num_cores_silkscreen}
                    </p>
                    <p className="text-xs text-slate-600">
                      Posições: {solicitacao.num_posicoes_silkscreen}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-600 mb-1">Data de Entrega</p>
                  <p className="font-medium">
                    {new Date(solicitacao.data_entrega_cliente).toLocaleDateString(
                      "pt-BR"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Vendedor</p>
                  <p className="font-medium text-sm">{solicitacao.vendedor_email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Aba Chat */}
          {expandedSection === "chat" && (
            <ChatInterno
              solicitacaoId={solicitacao.id}
              tipo="PPCP"
              usuarioEmail={usuarioAtual?.email}
              usuarioNome={usuarioAtual?.full_name}
              onMessageAdded={onRefresh}
            />
          )}

          {/* Aba Ações */}
          {expandedSection === "acoes" && (
            <div className="space-y-4">
              {!["Aprovado", "Reprovado"].includes(solicitacao.status) && (
                <>
                  {!mostrarCampoValidade ? (
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        onClick={() => {
                          onStatusChange(solicitacao, "Em análise");
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Em análise
                      </Button>

                      <Button
                        onClick={() => {
                          onStatusChange(solicitacao, "Ajustes");
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        Ajustar
                      </Button>

                      <Button
                        onClick={() => setMostrarCampoValidade(true)}
                        className="bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprovar
                      </Button>

                      <Button
                        onClick={handleRejeicao}
                        variant="destructive"
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reprovar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                      <p className="font-medium text-sm">
                        Selecione a validade da aprovação:
                      </p>
                      <Select value={validadeAprovacao} onValueChange={setValidadeAprovacao}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 horas</SelectItem>
                          <SelectItem value="24">24 horas</SelectItem>
                          <SelectItem value="36">36 horas</SelectItem>
                          <SelectItem value="48">48 horas</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAprovacao}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Confirmar Aprovação
                        </Button>
                        <Button
                          onClick={() => setMostrarCampoValidade(false)}
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {["Aprovado", "Reprovado"].includes(solicitacao.status) && (
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