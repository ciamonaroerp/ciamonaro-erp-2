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

const STATUS_OPTIONS = ["Enviado à logística", "Em análise", "Ajustes", "Concluído"];

export default function DetalhesFrete({
  solicitacao,
  onClose,
  onStatusChange,
}) {
  const [novoStatus, setNovoStatus] = useState(solicitacao.status);

  const handleStatusChange = () => {
    if (novoStatus !== solicitacao.status) {
      onStatusChange(novoStatus);
    }
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
            {/* Cliente */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Cliente</h4>
              <p className="text-sm">
                <span className="text-slate-600">Nome:</span>{" "}
                <span className="font-medium">{solicitacao.cliente_nome}</span>
              </p>
            </div>

            {/* Destino */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Destino</h4>
              <p className="text-sm">
                <span className="text-slate-600">CEP:</span>{" "}
                <span className="font-medium">{solicitacao.cep_destino}</span>
              </p>
            </div>

            {/* Detalhes da Entrega */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">
                Detalhes da Entrega
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Data de Entrega</p>
                  <p className="font-medium">
                    {new Date(solicitacao.data_entrega).toLocaleDateString(
                      "pt-BR"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Quantidade</p>
                  <p className="font-medium">
                    {solicitacao.quantidade_camisetas} camisetas
                  </p>
                </div>
              </div>
            </div>

            {/* Valor */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Valor</h4>
              <p className="text-sm">
                <span className="text-slate-600">Total:</span>{" "}
                <span className="font-medium">
                  R$ {parseFloat(solicitacao.valor_mercadoria).toFixed(2)}
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
                  {STATUS_OPTIONS.map((status) => (
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
              tipo="Frete"
              statusAtual={solicitacao.status}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}