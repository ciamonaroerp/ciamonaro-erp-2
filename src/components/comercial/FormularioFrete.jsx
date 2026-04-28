import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

export default function FormularioFrete({ onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    cliente_nome: "",
    cep_destino: "",
    data_entrega: "",
    quantidade_camisetas: "",
    valor_mercadoria: "",
    observacoes_vendedor: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle>Nova Cotação de Frete</CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações do Cliente */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Cliente</h3>
              <div>
                <Label htmlFor="cliente" className="text-sm">
                  Nome do cliente *
                </Label>
                <Input
                  id="cliente"
                  value={formData.cliente_nome}
                  onChange={(e) =>
                    setFormData({ ...formData, cliente_nome: e.target.value })
                  }
                  placeholder="Nome do cliente"
                  required
                />
              </div>
            </div>

            {/* Destino */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Destino</h3>
              <div>
                <Label htmlFor="cep" className="text-sm">
                  CEP destino *
                </Label>
                <Input
                  id="cep"
                  value={formData.cep_destino}
                  onChange={(e) =>
                    setFormData({ ...formData, cep_destino: e.target.value })
                  }
                  placeholder="00000-000"
                  required
                />
              </div>
            </div>

            {/* Detalhes da Entrega */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">
                Detalhes da Entrega
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entrega" className="text-sm">
                    Data de entrega *
                  </Label>
                  <Input
                    id="entrega"
                    type="date"
                    value={formData.data_entrega}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        data_entrega: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantidade" className="text-sm">
                    Quantidade de camisetas *
                  </Label>
                  <Input
                    id="quantidade"
                    type="number"
                    value={formData.quantidade_camisetas}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantidade_camisetas: parseInt(e.target.value) || "",
                      })
                    }
                    placeholder="0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Valor</h3>
              <div>
                <Label htmlFor="valor" className="text-sm">
                  Valor total da mercadoria *
                </Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor_mercadoria}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valor_mercadoria: parseFloat(e.target.value) || "",
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">
                Observações do vendedor
              </h3>
              <Textarea
                value={formData.observacoes_vendedor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observacoes_vendedor: e.target.value,
                  })
                }
                placeholder="Deixe suas observações aqui..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Cotação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}