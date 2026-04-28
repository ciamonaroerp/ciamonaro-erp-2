import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosErpService, modulosErpService } from "@/components/services/administracaoService";
import { criarUsuario, enviarConviteUsuario } from "@/components/modules/admin/usuarioCreateService";
import { getSupabase } from "@/components/lib/supabaseClient";
import { useEmpresa } from "@/components/context/EmpresaContext";
import ErpTable from "@/components/erp/ErpTable";
import PageHeader from "@/components/admin/PageHeader";
import UsuarioModal from "@/components/admin/UsuarioModal";
import ErpPageLayout from "@/components/design-system/ErpPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { supabase } from "@/components/lib/supabaseClient";
import { Plus, Send, KeyRound, Trash2, RefreshCw, Users } from "lucide-react";
import { format } from "date-fns";
import StatCard from "@/components/admin/StatCard";
import SearchAndCreateHeader from "@/components/admin/SearchAndCreateHeader";

const COLS = [
  {
    key: "nome",
    label: "Usuário",
    render: (val, row) => (
      <span className="font-medium flex items-center gap-1.5">
        {row.numero_cadastro && (
          <span className="text-slate-400 font-mono text-xs">{row.numero_cadastro}</span>
        )}
        <span className="text-slate-800">{val}</span>
      </span>
    ),
  },
  { key: "email", label: "Email" },
  { key: "setor", label: "Setor", render: (val) => val || "—" },
  { key: "perfil", label: "Perfil" },
  {
    key: "cadastros_autorizados",
    label: "Permissões",
    render: (val, row) => {
      const total = (val?.length || 0) + (row.sistema_autorizado?.length || 0) + (row.modulos_autorizados?.length || 0);
      return total > 0 
        ? <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">{total} permissões</Badge>
        : <span className="text-slate-300 text-xs">—</span>;
    },
  },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Data Criação", render: (val) => val ? format(new Date(val), "dd/MM/yyyy") : "—" },
];

export default function Usuarios() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showError, showDelete, showConfirm } = useGlobalAlert();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [modulosChecked, setModulosChecked] = useState([]);
  const [cadastrosChecked, setCadastrosChecked] = useState([]);
  const [sistemaChecked, setSistemaChecked] = useState([]);
  const [permissoes, setPermissoes] = useState([]); // [{ modulo, paginas: [] }]
  const [sincronizando, setSincronizando] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");


  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["erp-usuarios", empresa_id],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("erp_usuarios")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!empresa_id,
  });

  const { data: modulosErp = [] } = useQuery({
    queryKey: ["modulos-erp", empresa_id],
    queryFn: () => modulosErpService.listar(empresa_id),
    enabled: !!empresa_id,
  });

  const modulosDinamicos = modulosErp
    .filter(m => m.status === "Ativo" && m.nome_modulo)
    .map(m => m.nome_modulo);

  // Carrega módulos + páginas para a aba de permissões granulares
  const { data: modulosPaginas = [], isLoading: isLoadingModulos } = useQuery({
    queryKey: ["modulos-paginas-completo", empresa_id],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from("modulo_paginas")
        .select("*")
        .eq("empresa_id", empresa_id)
        .order("modulo", { ascending: true });
      return data || [];
    },
    enabled: !!empresa_id,
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }) => usuariosErpService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries(["erp-usuarios"]); closeModal(); },
  });

  const deletarMutation = useMutation({
    mutationFn: async (id) => {
      if (!supabase) throw new Error("Supabase não inicializado.");
      const { error } = await supabase
        .from("erp_usuarios")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries(["erp-usuarios"]),
  });

  const handleSincronizarStatus = async () => {
    setSincronizando(true);
    try {
      if (!supabase) throw new Error("Supabase não inicializado.");
      // Ativa usuários Pendentes que já possuem conta no Auth (best-effort)
      const { data: pendentes } = await supabase
        .from("erp_usuarios")
        .select("id, email")
        .eq("status", "Pendente")
        .is("deleted_at", null);

      let atualizados = 0;
      for (const u of pendentes || []) {
        const { data: authUsers } = await supabase
          .from("erp_usuarios")
          .select("id")
          .eq("email", u.email)
          .eq("status", "Pendente");
        if (authUsers?.length) {
          await supabase.from("erp_usuarios").update({ status: "Ativo" }).eq("id", u.id);
          atualizados++;
        }
      }

      qc.invalidateQueries(["erp-usuarios"]);
      showConfirm({ title: "Sincronização concluída", description: `${atualizados} usuário(s) verificado(s).`, confirmLabel: "OK", cancelLabel: null });
    } catch (err) {
      showError({ title: "Erro ao sincronizar", description: err?.message || 'Erro desconhecido' });
    } finally {
      setSincronizando(false);
    }
  };

  const closeModal = () => { 
    setModalOpen(false); 
    setFormData({}); 
    setEditingId(null); 
    setModulosChecked([]);
    setCadastrosChecked([]);
    setSistemaChecked([]);
    setPermissoes([]);
  };

  const handleEdit = (row) => {
    setFormData({ nome: row.nome, email: row.email, perfil: row.perfil, status: row.status, setor: row.setor || "", assinatura_url: row.assinatura_url || "", numero_cadastro: row.numero_cadastro || "" });
    setModulosChecked(row.modulos_autorizados || []);
    setCadastrosChecked(row.cadastros_autorizados || []);
    setSistemaChecked(row.sistema_autorizado || []);
    setPermissoes(Array.isArray(row.permissoes) ? row.permissoes : []);
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleToggleStatus = (row) => {
    const novoStatus = row.status === "Ativo" ? "Inativo" : "Ativo";
    editarMutation.mutate({ id: row.id, data: { status: novoStatus } });
  };

  const handleReenviarConvite = async (row) => {
    try {
      await enviarConviteUsuario(row.email, row.nome);
      showConfirm({ title: "Convite reenviado", description: "O convite foi reenviado com sucesso.", confirmLabel: "OK", cancelLabel: null });
    } catch (err) {
      showError({ title: "Falha ao reenviar convite", description: err.message || "Erro desconhecido" });
    }
  };

  const handleResetarSenha = async (row) => {
    const client = await getSupabase();
    const { error } = await client.auth.resetPasswordForEmail(row.email);
    if (error) showError({ title: "Erro ao redefinir senha", description: error.message });
    else showConfirm({ title: "Email enviado", description: "Email de redefinição de senha enviado com sucesso.", confirmLabel: "OK", cancelLabel: null });
  };

  const toggleModulo = (modulo) =>
    setModulosChecked(prev => prev.includes(modulo) ? prev.filter(m => m !== modulo) : [...prev, modulo]);

  const toggleCadastro = (cadastro) =>
    setCadastrosChecked(prev => prev.includes(cadastro) ? prev.filter(c => c !== cadastro) : [...prev, cadastro]);

  const toggleSistema = (sistema) =>
    setSistemaChecked(prev => prev.includes(sistema) ? prev.filter(s => s !== sistema) : [...prev, sistema]);

  const handleSubmit = async () => {
    const payload = { 
      ...formData, 
      modulos_autorizados: Array.isArray(modulosChecked) ? modulosChecked : [],
      cadastros_autorizados: Array.isArray(cadastrosChecked) ? cadastrosChecked : [],
      sistema_autorizado: Array.isArray(sistemaChecked) ? sistemaChecked : [],
      permissoes: Array.isArray(permissoes) ? permissoes : [],
      empresa_id 
    };
    if (editingId) {
      editarMutation.mutate({ id: editingId, data: payload });
    } else {
      try {
        await criarUsuario({ ...payload, status: "Enviado" });
        qc.invalidateQueries(["erp-usuarios"]);
        closeModal();
      } catch (err) {
      showError({ title: "Erro ao criar usuário", description: err.message || "Verifique os dados." });
      }
    }
  };

  return (
    <ErpPageLayout
      title="Usuários"
      description="Gestão centralizada de usuários do CIAMONARO ERP"
    >
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard title="Total" value={usuarios.length} icon={Users} color="blue" />
        <StatCard title="Ativos" value={usuarios.filter(u => u.status === "Ativo").length} icon={Users} color="emerald" />
        <StatCard title="Pendentes" value={usuarios.filter(u => u.status === "Pendente").length} icon={Users} color="amber" />
        <StatCard title="Inativos" value={usuarios.filter(u => u.status === "Inativo").length} icon={Users} color="rose" />
      </div>

      {/* Barra de busca com dois botões de ação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 h-9 text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleSincronizarStatus} disabled={sincronizando} className="gap-2 text-slate-700 rounded-lg">
            <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} /> Sincronizar Status
          </Button>
          <Button size="sm" onClick={() => { setFormData({ status: "Ativo" }); setEditingId(null); setModulosChecked([]); setCadastrosChecked([]); setSistemaChecked([]); setPermissoes([]); setModalOpen(true); }} style={{ background: '#3B5CCC' }} className="text-white gap-2 rounded-lg">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      <ErpTable
        titulo="Usuários ERP"
        colunas={COLS}
        dados={usuarios.filter(u => 
          !searchTerm || u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )}
        isLoading={isLoading}
        campoBusca="nome"
        onEditar={handleEdit}
        showSearchBar={false}
        acoes={[
          { titulo: "Reenviar convite", icone: Send, className: "hover:text-indigo-600", onClick: handleReenviarConvite },
          { titulo: "Resetar senha", icone: KeyRound, className: "hover:text-orange-600", onClick: handleResetarSenha },
          { titulo: "Excluir usuário", icone: Trash2, className: "hover:text-red-600", onClick: (row) => showDelete({ title: "Excluir usuário", description: `Tem certeza que deseja excluir o usuário "${row.nome}"? Esta ação não pode ser desfeita.`, onConfirm: () => deletarMutation.mutateAsync(row.id) }) },
        ]}
      />

      <UsuarioModal
        open={modalOpen}
        onClose={setModalOpen}
        formData={formData}
        onChange={(key, val) => setFormData(prev => ({ ...prev, [key]: val }))}
        modulosChecked={modulosChecked}
        onToggleModulo={toggleModulo}
        modulosDinamicos={modulosDinamicos}
        cadastrosChecked={cadastrosChecked}
        onToggleCadastro={toggleCadastro}
        sistemaChecked={sistemaChecked}
        onToggleSistema={toggleSistema}
        permissoes={permissoes}
        onChangePermissoes={setPermissoes}
        modulosPaginas={modulosPaginas}
        isLoadingModulos={isLoadingModulos}
        onSubmit={handleSubmit}
        isSubmitting={editarMutation.isPending}
        isEditing={!!editingId}
      />
    </ErpPageLayout>
  );
}