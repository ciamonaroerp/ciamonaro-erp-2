import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Mail, Shield, ImageIcon, Lock } from "lucide-react";
import { supabase } from "@/components/lib/supabaseClient";
import AbaPermissoesModulos from "./AbaPermissoesModulos";

const SETORES = [
  "Administrativo", "Almoxarifado", "Comercial", "Marketing",
  "Produção", "PPCP", "Logistica", "Rec. Humanos", "Financeiro"
];

const PERFIS = ["Administrador", "Usuário"];

const TABS = ["Dados Pessoais", "Configurações de Acesso", "Permissões por Módulo"];

export default function UsuarioModal({
  open, onClose, formData, onChange,
  permissoes, onChangePermissoes,
  modulosPaginas, isLoadingModulos,
  onSubmit, isSubmitting, isEditing,
  // Props legadas mantidas para não quebrar
  modulosChecked, onToggleModulo, modulosDinamicos,
  cadastrosChecked, onToggleCadastro,
  sistemaChecked, onToggleSistema,
}) {
  const fileInputRef = useRef(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage.from('uploads').upload(`assinaturas/${Date.now()}_${file.name}`, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(uploadData.path);
      const file_url = publicUrl;
      onChange("assinatura_url", file_url);
    } catch (err) {
      alert("Erro ao fazer upload da imagem: " + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const isAdmin = formData.perfil === "Administrador";

  const handleClose = () => {
    setActiveTab(0);
    onClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0 -mx-6 px-6">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === idx
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">

            {/* ── ABA 0: Dados Pessoais ── */}
            {activeTab === 0 && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Dados Pessoais
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Nome Completo *</Label>
                    <Input
                      value={formData.nome || ""}
                      onChange={(e) => onChange("nome", e.target.value)}
                      placeholder="Nome completo do usuário"
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> Email *
                    </Label>
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => onChange("email", e.target.value)}
                      placeholder="email@empresa.com"
                      required
                      disabled={isEditing}
                      className={`bg-white ${isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                    {isEditing && <p className="text-xs text-slate-400">Email não pode ser alterado após cadastro.</p>}
                  </div>
                </div>

                {/* Assinatura */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Assinatura</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-600 flex-1 truncate">
                      {formData.assinatura_url ? "Imagem carregada" : "Nenhuma imagem"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImg}
                      className="shrink-0"
                    >
                      {uploadingImg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Trocar imagem"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA 1: Configurações de Acesso ── */}
            {activeTab === 1 && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" /> Configurações de Acesso
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Perfil Global ERP</Label>
                    <Select value={formData.perfil || ""} onValueChange={(val) => onChange("perfil", val)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERFIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Setor</Label>
                    <Select value={formData.setor || ""} onValueChange={(val) => onChange("setor", val)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Status</Label>
                    <Select value={formData.status || "Ativo"} onValueChange={(val) => onChange("status", val)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enviado">📨 Enviado</SelectItem>
                        <SelectItem value="Ativo">✅ Ativo</SelectItem>
                        <SelectItem value="Inativo">⛔ Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-2">
                    <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-700">Administrador possui acesso total ao sistema, sem restrições.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA 2: Permissões por Módulo ── */}
            {activeTab === 2 && (
              <AbaPermissoesModulos
                isAdmin={isAdmin}
                modulosPaginas={modulosPaginas || []}
                permissoes={permissoes || []}
                onChange={onChangePermissoes}
                isLoading={isLoadingModulos}
              />
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}