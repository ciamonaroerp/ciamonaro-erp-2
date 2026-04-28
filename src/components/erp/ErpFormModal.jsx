/**
 * CIAMONARO ERP — Modal de formulário genérico para todos os módulos.
 * Suporta campos: text, email, select, textarea, number, date.
 */
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function ErpFormModal({
  open,
  onClose,
  titulo,
  campos = [],
  dados = {},
  onChange,
  onSubmit,
  isSubmitting = false,
  isEditing = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEditing ? `Editar ${titulo}` : `Novo ${titulo}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campos.map(campo => (
              <div key={campo.key} className={cn("space-y-1.5", campo.fullWidth ? "sm:col-span-2" : "")}>
                <Label className="text-sm font-medium text-slate-700">
                  {campo.label}{campo.required && " *"}
                </Label>

                {campo.type === "select" ? (
                  <Select
                    value={dados[campo.key] || ""}
                    onValueChange={val => onChange(campo.key, val)}
                    disabled={campo.disabled && isEditing}
                  >
                    <SelectTrigger className="bg-white h-9">
                      <SelectValue placeholder={campo.placeholder || "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {(campo.options || []).map(opt => (
                        <SelectItem key={opt.value ?? opt} value={opt.value ?? opt}>
                          {opt.label ?? opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : campo.type === "textarea" ? (
                  <textarea
                    value={dados[campo.key] || ""}
                    onChange={e => onChange(campo.key, e.target.value)}
                    placeholder={campo.placeholder}
                    required={campo.required}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                ) : (
                  <Input
                    type={campo.type || "text"}
                    value={dados[campo.key] || ""}
                    onChange={e => onChange(campo.key, e.target.value)}
                    placeholder={campo.placeholder}
                    required={campo.required}
                    disabled={campo.disabled && isEditing}
                    className="bg-white h-9"
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// helper para className condicional sem import adicional
function cn(...args) {
  return args.filter(Boolean).join(" ");
}