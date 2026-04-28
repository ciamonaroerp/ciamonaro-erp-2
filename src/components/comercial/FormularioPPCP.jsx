import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

export default function FormularioPPCP({ onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    cliente_nome: "",
    artigo: "",
    cor: "",
    modelo: "",
    quantidade: "",
    personalizacoes: {
      silkscreen: false,
      sublimacao: false,
      transfer: false,
      dtf: false,
      laser: false,
      manga: false,
    },
    mangas_personalizadas: "uma",
    num_cores_silkscreen: "",
    num_posicoes_silkscreen: "",
    data_entrega_cliente: "",
    observacoes_vendedor: "",
  });

  const handlePersonalizacaoChange = (tipo) => {
    setFormData({
      ...formData,
      personalizacoes: {
        ...formData.personalizacoes,
        [tipo]: !formData.personalizacoes[tipo],
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle>Nova Solicitação PPCP</CardTitle>
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
            {/* Cliente */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Cliente</h3>
              <div>
                <Label htmlFor="cliente" className="text-sm">
                  Nome do cliente
                </Label>
                <Input
                  id="cliente"
                  value={formData.cliente_nome}
                  onChange={(e) =>
                    setFormData({ ...formData, cliente_nome: e.target.value })
                  }
                  placeholder="Nome do cliente"
                />
              </div>
            </div>

            {/* Confecção */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Confecção</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="artigo" className="text-sm">
                    Artigo *
                  </Label>
                  <Input
                    id="artigo"
                    value={formData.artigo}
                    onChange={(e) =>
                      setFormData({ ...formData, artigo: e.target.value })
                    }
                    placeholder="Ex: Camiseta Dry"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="modelo" className="text-sm">
                    Modelo
                  </Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) =>
                      setFormData({ ...formData, modelo: e.target.value })
                    }
                    placeholder="Ex: Gola V"
                  />
                </div>
                <div>
                  <Label htmlFor="cor" className="text-sm">
                    Cor
                  </Label>
                  <Input
                    id="cor"
                    value={formData.cor}
                    onChange={(e) =>
                      setFormData({ ...formData, cor: e.target.value })
                    }
                    placeholder="Ex: Azul Royal"
                  />
                </div>
                <div>
                  <Label htmlFor="quantidade" className="text-sm">
                    Quantidade *
                  </Label>
                  <Input
                    id="quantidade"
                    type="number"
                    value={formData.quantidade}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantidade: parseInt(e.target.value) || "",
                      })
                    }
                    placeholder="0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Personalização */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Tipo de Personalização</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: "silkscreen", label: "Silk" },
                    { id: "sublimacao", label: "Sublimação" },
                    { id: "transfer", label: "Transfer" },
                    { id: "dtf", label: "DTF" },
                    { id: "laser", label: "Laser" },
                  ].map((tipo) => (
                    <label key={tipo.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.personalizacoes[tipo.id]}
                        onCheckedChange={() => handlePersonalizacaoChange(tipo.id)}
                      />
                      <span className="text-sm">{tipo.label}</span>
                    </label>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <Checkbox
                    checked={formData.personalizacoes.manga}
                    onCheckedChange={() => handlePersonalizacaoChange("manga")}
                  />
                  <span className="text-sm">Personalização na Manga</span>
                </label>
              </div>

              {formData.personalizacoes.silkscreen && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <Label htmlFor="cores" className="text-sm">
                      Número de cores
                    </Label>
                    <Input
                      id="cores"
                      type="number"
                      value={formData.num_cores_silkscreen}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          num_cores_silkscreen: parseInt(e.target.value) || "",
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="posicoes" className="text-sm">
                      Número de posições
                    </Label>
                    <Input
                      id="posicoes"
                      type="number"
                      value={formData.num_posicoes_silkscreen}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          num_posicoes_silkscreen: parseInt(e.target.value) || "",
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              {formData.personalizacoes.manga && (
                <div className="pt-3 border-t">
                  <Label htmlFor="mangas" className="text-sm">
                    Quantidade de mangas
                  </Label>
                  <Select
                    value={formData.mangas_personalizadas}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        mangas_personalizadas: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uma">Uma</SelectItem>
                      <SelectItem value="duas">Duas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Prazos */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Prazos</h3>
              <div>
                <Label htmlFor="entrega" className="text-sm">
                  Data de entrega final ao cliente *
                </Label>
                <Input
                  id="entrega"
                  type="date"
                  value={formData.data_entrega_cliente}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_entrega_cliente: e.target.value,
                    })
                  }
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
                {loading ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}