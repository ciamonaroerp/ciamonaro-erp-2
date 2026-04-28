import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewVersionModal({ open, onClose, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({ version: "", environment: "production", status: "draft", notes: "" });

  const handleSubmit = () => {
    if (!form.version.trim()) return;
    onSubmit(form);
    setForm({ version: "", environment: "production", status: "draft", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Versão</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Versão *</Label>
            <Input
              placeholder="ex: v1.2.0"
              value={form.version}
              onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label>Ambiente</Label>
            <Select value={form.environment} onValueChange={v => setForm(p => ({ ...p, environment: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status inicial</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Descreva as mudanças desta versão..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="mt-1 h-24 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !form.version.trim()} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting ? "Salvando..." : "Criar Versão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}