/**
 * Modal para capturar inputs de dependências de personalização
 * (cores, posições, valor variável, conforme flags em dependencias_pers)
 */
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function parseMoeda(str) {
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}

export default function ModalPersonalizacaoDependencias({ open, onClose, personalizacao, valoresSalvos, onConfirmar }) {
  const dep = personalizacao?.dependencias_pers || {};
  const [cores, setCores] = useState("");
  const [posicoes, setPosicoes] = useState("");
  const [valorVariavel, setValorVariavel] = useState("");
  const firstRef = useRef(null);

  // Preenche com valores salvos ao abrir
  useEffect(() => {
    if (open && valoresSalvos) {
      setCores(valoresSalvos.cores != null ? String(valoresSalvos.cores) : "");
      setPosicoes(valoresSalvos.posicoes != null ? String(valoresSalvos.posicoes) : "");
      setValorVariavel(valoresSalvos.valor_variavel != null ? String(valoresSalvos.valor_variavel) : "");
    } else if (open) {
      setCores("");
      setPosicoes("");
      setValorVariavel("");
    }
    if (open) {
      setTimeout(() => firstRef.current?.focus(), 100);
    }
  }, [open, valoresSalvos]);

  const handleConfirmar = () => {
    // Validação: campos obrigatórios conforme flags
    if (dep.usa_cores && (!cores || parseInt(cores) < 1)) {
      alert("Informe a quantidade de cores (mínimo 1)");
      return;
    }
    if (dep.usa_posicoes && (!posicoes || parseInt(posicoes) < 1)) {
      alert("Informe a quantidade de posições (mínimo 1)");
      return;
    }
    if (dep.usa_valor_variavel && (!valorVariavel || parseMoeda(valorVariavel) <= 0)) {
      alert("Informe um valor válido maior que zero");
      return;
    }
    onConfirmar({
      id: personalizacao.id,
      cores: dep.usa_cores ? parseInt(cores) : null,
      posicoes: dep.usa_posicoes ? parseInt(posicoes) : null,
      valor_variavel: dep.usa_valor_variavel ? parseMoeda(valorVariavel) : null,
    });
  };

  const handleValorVariavelChange = (raw) => {
    const digits = raw.replace(/\D/g, "");
    const cents = parseInt(digits || "0", 10);
    const formatted = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setValorVariavel(formatted);
  };

  const temAlgumaDep = dep.usa_cores || dep.usa_posicoes || dep.usa_valor_variavel;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {personalizacao?.tipo_personalizacao || "Personalização"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {!temAlgumaDep && (
            <p className="text-xs text-slate-500">Sem configurações adicionais para esta personalização.</p>
          )}

          {dep.usa_cores && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Número de cores *</Label>
              <Input
                ref={firstRef}
                type="text"
                inputMode="numeric"
                value={cores}
                onChange={e => setCores(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleConfirmar()}
                placeholder="Ex: 2"
                className="h-9 text-sm text-center font-mono"
              />
            </div>
          )}

          {dep.usa_posicoes && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Número de posições *</Label>
              <Input
                ref={!dep.usa_cores ? firstRef : undefined}
                type="text"
                inputMode="numeric"
                value={posicoes}
                onChange={e => setPosicoes(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleConfirmar()}
                placeholder="Ex: 1"
                className="h-9 text-sm text-center font-mono"
              />
            </div>
          )}

          {dep.usa_valor_variavel && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Valor (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 pointer-events-none">R$</span>
                <Input
                  ref={!dep.usa_cores && !dep.usa_posicoes ? firstRef : undefined}
                  type="text"
                  inputMode="numeric"
                  value={valorVariavel}
                  onChange={e => handleValorVariavelChange(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleConfirmar()}
                  placeholder="0,00"
                  className="h-9 text-sm pl-8 text-right font-mono"
                />
              </div>
            </div>
          )}

          {dep.usa_valor_unitario && !dep.usa_cores && !dep.usa_posicoes && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-2">
              Valor unitário fixo será aplicado automaticamente.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="text-xs h-8">
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} className="bg-blue-600 hover:bg-blue-700 text-xs h-8">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}