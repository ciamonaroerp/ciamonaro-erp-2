import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChatInterno from "./ChatInterno";

export default function DetalhesSolicitacao({
  solicitacao,
  tipo,
  onClose,
  onStatusChange,
}) {
  const [novoStatus, setNovoStatus] = useState(solicitacao.status);

  const statusOptions =
    tipo === "PPCP"
      ? ["Enviado ao PPCP", "Em análise", "Ajustes", "Aprovado", "Reprovado"]
      : ["Enviado à logística", "Em análise", "Ajustes", "Concluído"];

  const handleStatusChange = () => {
    if (novoStatus !== solicitacao.status) {
      onStatusChange(novoStatus);
    }
  };

  const getPersonalizacaoLabel = () => {
    if (solicitacao.tipo_personalizacao === "Personalização na manga") {
      return `Personalização na manga (${solicitacao.mangas_personalizadas})`;
    }
    return solicitacao.tipo_personalizacao;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle>{solicitacao.numero_solicitacao}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {solicitacao.cliente_nome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto grid grid-cols-3 gap-6 pt-6">
          {/* Coluna Esquerda - Detalhes */}
          <div className="col-span-2 space-y-6">
            {/* Confecção */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Confecção</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Artigo</p>
                  <p className="font-medium">{solicitacao.artigo}</p>
                </div>
                <div>
                  <p className="text-slate-600">Cor</p>
                  <p className="font-medium">{solicitacao.cor}</p>
                </div>
                <div>
                  <p className="text-slate-600">Modelo</p>
                  <p className="font-medium">{solicitacao.modelo}</p>
                </div>
                <div>
                  <p className="text-slate-600">Quantidade</p>
                  <p className="font-medium">{solicitacao.quantidade}</p>
                </div>
              </div>
            </div>

            {/* Personalização */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">
                Personalização
              </h4>
              <p className="text-sm">
                <span className="text-slate-600">Tipo:</span>{" "}
                <span className="font-medium">
                  {getPersonalizacaoLabel()}
                </span>
              </p>
              {solicitacao.tipo_personalizacao === "Silkscreen" && (
                <div className="mt-2 text-sm">
                  <p>
                    <span className="text-slate-600">Cores:</span>{" "}
                    <span className="font-medium">
                      {solicitacao.num_cores_silkscreen}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-600">Posições:</span>{" "}
                    <span className="font-medium">
                      {solicitacao.num_posicoes_silkscreen}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Prazos */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Prazos</h4>
              <p className="text-sm">
                <span className="text-slate-600">Entrega:</span>{" "}
                <span className="font-medium">
                  {new Date(solicitacao.data_entrega_cliente).toLocaleDateString(
                    "pt-BR"
                  )}
                </span>
              </p>
            </div>

            {/* Status */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Status</h4>
              <Select value={novoStatus} onValueChange={setNovoStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {novoStatus !== solicitacao.status && (
                <Button
                  onClick={handleStatusChange}
                  size="sm"
                  className="mt-2 w-full"
                >
                  Atualizar Status
                </Button>
              )}
            </div>
          </div>

          {/* Coluna Direita - Chat */}
          <div className="border-l h-full flex flex-col">
            <ChatInterno
              solicitacaoId={solicitacao.numero_solicitacao}
              tipo={tipo}
              statusAtual={solicitacao.status}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}