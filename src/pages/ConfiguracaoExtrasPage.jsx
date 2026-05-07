import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/components/lib/supabaseClient";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { useGradesTamanho } from "@/hooks/useGradesTamanho";
import { formVazio as gradeFormVazio } from "@/domain/gradesTamanhoDomain";
import GradeItensPanel from "@/components/grades/GradeItensPanel";
import TamanhosGlobaisPanel from "@/components/grades/TamanhosGlobaisPanel";

// ─── Serviços ──────────────────────────────────────────────────────────────

async function listar(tabela, empresa_id) {
  if (!empresa_id || !supabase) return [];
  const { data } = await supabase.from(tabela).select("*").eq("empresa_id", empresa_id).is("deleted_at", null);
  return data || [];
}

async function criar(tabela, empresa_id, payload) {
  if (!empresa_id) throw new Error("Empresa ID obrigatório");
  const { data, error } = await supabase.from(tabela).insert({ ...payload, empresa_id }).select().single();
  if (error) throw new Error(error.message);
  return data || {};
}

async function atualizar(tabela, id, payload) {
  const { data, error } = await supabase.from(tabela).update(payload).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data || {};
}

async function softDelete(tabela, id) {
  const { error } = await supabase.from(tabela).update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  return {};
}

// ─── Gerador de Código ─────────────────────────────────────────────────────

function gerarProximoCodigo(lista, prefixo, campo) {
  const nums = lista
    .map((item) => {
      const cod = item[campo] || "";
      if (cod.toUpperCase().startsWith(prefixo.toUpperCase())) {
        return parseInt(cod.slice(prefixo.length), 10);
      }
      return 0;
    })
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefixo.toLowerCase()}${String(max + 1).padStart(3, "0")}`;
}

// ─── Formata valor numérico ────────────────────────────────────────────────

function formatarValor(val) {
  if (val === null || val === undefined || val === "") return "-";
  const num = parseFloat(val);
  if (isNaN(num)) return "-";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Componente da Tabela ──────────────────────────────────────────────────

function TabelaRegistros({ colunas, dados, loading, onEditar, onDeletar, emptyMsg }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {colunas.map((col) => (
              <TableHead key={col.key} className={col.right ? "text-right" : ""}>
                {col.label}
              </TableHead>
            ))}
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={colunas.length + 1} className="text-center py-8 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : dados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colunas.length + 1} className="text-center py-8 text-slate-500">
                {emptyMsg}
              </TableCell>
            </TableRow>
          ) : (
            dados.map((item) => (
              <TableRow key={item.id}>
                {colunas.map((col) => (
                  <TableCell
                    key={col.key}
                    className={col.mono ? "font-mono font-semibold" : col.muted ? "text-slate-500" : "font-medium"}
                  >
                    <span className={col.right ? "block text-right" : ""}>
                {col.render ? col.render(item) : (item[col.key] ?? "-")}
              </span>
                  </TableCell>
                ))}
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600" onClick={() => onEditar(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-red-500"
                    onClick={() => onDeletar(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

// ─── Helpers Estamparia ───────────────────────────────────────────────────

function gerarCodigoPRM(lista) {
  const nums = lista.map(item => {
    const cod = item.codigo || "";
    if (cod.toUpperCase().startsWith("PRM")) return parseInt(cod.slice(3), 10);
    return 0;
  }).filter(n => !isNaN(n) && n > 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `PRM${String(max + 1).padStart(2, "0")}`;
}

function formatarTempoMin(val) {
  if (val === null || val === undefined || val === "" || val === 0) return null;
  const num = parseInt(val, 10);
  if (isNaN(num) || num <= 0) return null;
  return `${num} min`;
}

// ─── Checkboxes de Opções da Personalização ────────────────────────────────

const OPCOES_PERS = [
  { key: "usa_valor_unitario", label: "Valor unitario" },
  { key: "usa_valor_variavel", label: "Valor variável" },
  { key: "usa_posicoes", label: "Posicoes" },
  { key: "usa_cores", label: "Cores" },
];

// ─── Página Principal ──────────────────────────────────────────────────────

export default function ConfiguracaoExtrasPage() {
  const { empresa_id } = useEmpresa();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showConfirm } = useGlobalAlert();

  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Grades de Tamanho ──
  const { grades, loading: gradesLoading, criar: criarGrade, atualizar: atualizarGrade, toggleAtivo: toggleAtivoGrade } = useGradesTamanho();
  const [gradeModal, setGradeModal] = useState(false);
  const [gradeEditingId, setGradeEditingId] = useState(null);
  const [gradeForm, setGradeForm] = useState(gradeFormVazio);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeBusca, setGradeBusca] = useState("");
  const [gradeSelecionada, setGradeSelecionada] = useState(null);

  // ── Estado Tamanhos ──
  const [tamanhoModal, setTamanhoModal] = useState(false);
  const [tamanhoEditingId, setTamanhoEditingId] = useState(null);
  const [tamanhoForm, setTamanhoForm] = useState({ tamanho_abreviado: "", descricao: "", categoria: "" });

  // ── Estado Estamparia ──
  const [estampariaModal, setEstampariaModal] = useState(false);
  const [estampariaEditingId, setEstampariaEditingId] = useState(null);
  const [estampariaForm, setEstampariaForm] = useState({
    descricao: "",
    tipo_parametro: [],
    valor: "",
    tempo: "",
    unidade: "",
    vinc_estamparia: [],
  });

  const emptyForm = {
    nome_acabamento: "",
    tipo_personalizacao: "",
    tipo_dependencia: "",
    descricao: "",
    valor_acab_un: "",
    valor_pers_un: "",
    valor_un_adic: "",
    tipo_valor: "unitario",
    usa_valor_unitario: false,
    usa_valor_variavel: false,
    usa_posicoes: false,
    usa_cores: false,
    impressao: [],
  };

  const [formData, setFormData] = useState(emptyForm);

  // ── Queries ──
  const acabamentosQuery = useQuery({
    queryKey: ["config-extras-acabamentos", empresa_id],
    queryFn: () => listar("config_acabamentos", empresa_id),
    enabled: !!empresa_id,
    staleTime: Infinity,
  });

  const personalizacaoQuery = useQuery({
    queryKey: ["config-extras-personalizacao", empresa_id],
    queryFn: () => listar("config_personalizacao", empresa_id),
    enabled: !!empresa_id,
    staleTime: Infinity,
  });

  const dependenciasQuery = useQuery({
    queryKey: ["config-extras-dependencias", empresa_id],
    queryFn: () => listar("config_dependencias", empresa_id),
    enabled: !!empresa_id,
    staleTime: Infinity,
  });

  const estampariaQuery = useQuery({
    queryKey: ["config-extras-estamparia", empresa_id],
    queryFn: () => listar("config_estamparia", empresa_id),
    enabled: !!empresa_id,
    staleTime: 0,
  });

  const tamanhosQuery = useQuery({
    queryKey: ["config-extras-tamanhos", empresa_id],
    queryFn: () => listar("config_tamanhos", empresa_id),
    enabled: !!empresa_id,
    staleTime: 0,
  });

  // Verificação de vínculos para cada item de estamparia
  const [vinculosEstamparia, setVinculosEstamparia] = useState({});
  const [loadingVinculos, setLoadingVinculos] = useState(false);

  useEffect(() => {
    const listaEstamparia = (estampariaQuery.data || []).filter(i => !i.deleted_at);
    if (!empresa_id || listaEstamparia.length === 0) return;
    setLoadingVinculos(true);
    Promise.all(
      listaEstamparia.map(async (item) => {
        return { id: item.id, vinculado: false };
      })
    ).then((resultados) => {
      const mapa = {};
      resultados.forEach(({ id, vinculado }) => { mapa[id] = vinculado; });
      setVinculosEstamparia(mapa);
    }).finally(() => setLoadingVinculos(false));
  }, [estampariaQuery.data, empresa_id]);

  const acabamentos = (acabamentosQuery.data || []).filter(i => !i.deleted_at);
  const personalizacoes = (personalizacaoQuery.data || []).filter(i => !i.deleted_at);
  const dependencias = (dependenciasQuery.data || []).filter(i => !i.deleted_at);
  const estamparia = (estampariaQuery.data || []).filter(i => !i.deleted_at);
  const tamanhos = (tamanhosQuery.data || []).filter(i => !i.deleted_at);

  // ── Helpers ──
  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setOpenModal(false);
    setSaving(false);
  };

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    if (item) {
      setEditingId(item.id);
      if (type === "acabamento") {
        setFormData({
          ...emptyForm,
          nome_acabamento: item.nome_acabamento || "",
          descricao: item.descricao || "",
          valor_acab_un: item.valor_acab_un !== null && item.valor_acab_un !== undefined ? String(item.valor_acab_un) : "",
        });
      } else if (type === "personalizacao") {
        setFormData({
          ...emptyForm,
          tipo_personalizacao: item.tipo_personalizacao || "",
          descricao: item.descricao || "",
          valor_pers_un: item.valor_pers_un !== null && item.valor_pers_un !== undefined ? String(item.valor_pers_un) : "",
          usa_valor_unitario: !!item.usa_valor_unitario,
          usa_valor_variavel: !!item.usa_valor_variavel,
          usa_posicoes: !!item.usa_posicoes,
          usa_cores: !!item.usa_cores,
          impressao: Array.isArray(item.impressao) ? item.impressao : [],
        });
      } else if (type === "dependencia") {
        setFormData({
          ...emptyForm,
          tipo_dependencia: item.tipo_dependencia || "",
          descricao: item.descricao || "",
          valor_un_adic: item.valor_un_adic !== null && item.valor_un_adic !== undefined ? String(item.valor_un_adic) : "",
          tipo_valor: item.tipo_valor ? "unitario" : "variavel",
        });
      }
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modalType === "acabamento") {
        if (!formData.nome_acabamento.trim()) {
          showError({ title: "Campo obrigatório", description: "Nome do acabamento é obrigatório." });
          setSaving(false);
          return;
        }
        const valorNum = formData.valor_acab_un !== "" ? parseFloat(String(formData.valor_acab_un).replace(",", ".")) : null;
        const payload = {
          empresa_id: empresa_id || null,
          nome_acabamento: formData.nome_acabamento,
          descricao: formData.descricao || null,
          valor_acab_un: !isNaN(valorNum) && valorNum !== null ? valorNum : null,
          updated_at: new Date().toISOString(),
        };
        if (!editingId) {
          payload.codigo_acabamento = gerarProximoCodigo(acabamentos, "a", "codigo_acabamento");
          payload.data_criacao = new Date().toISOString();
          const res = await criar("config_acabamentos", empresa_id, payload);
          if (res?.error) { showError({ title: "Erro ao adicionar", description: res.error }); setSaving(false); return; }
          showSuccess({ title: "Sucesso", description: "Acabamento adicionado com sucesso." });
        } else {
          const res = await atualizar("config_acabamentos", editingId, payload);
          if (res?.error) { showError({ title: "Erro ao atualizar", description: res.error }); setSaving(false); return; }
          showSuccess({ title: "Atualizado", description: "Acabamento atualizado com sucesso." });
        }
        queryClient.invalidateQueries({ queryKey: ["config-extras-acabamentos"] });

      } else if (modalType === "personalizacao") {
        if (!formData.tipo_personalizacao.trim()) {
          showError({ title: "Campo obrigatório", description: "Tipo de personalização é obrigatório." });
          setSaving(false);
          return;
        }
        const valorPersNum = formData.valor_pers_un !== "" ? parseFloat(String(formData.valor_pers_un).replace(",", ".")) : null;
        const opcoes = {
          usa_valor_unitario: !!formData.usa_valor_unitario,
          usa_valor_variavel: !!formData.usa_valor_variavel,
          usa_posicoes: !!formData.usa_posicoes,
          usa_cores: !!formData.usa_cores,
        };
        const payload = {
          empresa_id: empresa_id || null,
          tipo_personalizacao: formData.tipo_personalizacao,
          descricao: formData.descricao || null,
          valor_pers_un: formData.usa_valor_unitario && !isNaN(valorPersNum) && valorPersNum !== null ? valorPersNum : null,
          ...opcoes,
          dependencias_pers: opcoes,
          impressao: Array.isArray(formData.impressao) ? formData.impressao : [],
          updated_at: new Date().toISOString(),
        };
        if (!editingId) {
          payload.codigo_personalizacao = gerarProximoCodigo(personalizacoes, "p", "codigo_personalizacao");
          payload.data_criacao = new Date().toISOString();
          const res = await criar("config_personalizacao", empresa_id, payload);
          if (res?.error) { showError({ title: "Erro ao adicionar", description: res.error }); setSaving(false); return; }
          showSuccess({ title: "Sucesso", description: "Personalização adicionada com sucesso." });
        } else {
          const res = await atualizar("config_personalizacao", editingId, payload);
          if (res?.error) { showError({ title: "Erro ao atualizar", description: res.error }); setSaving(false); return; }
          showSuccess({ title: "Atualizado", description: "Personalização atualizada com sucesso." });
        }
        queryClient.invalidateQueries({ queryKey: ["config-extras-personalizacao"] });

      } else if (modalType === "dependencia") {
         if (!formData.tipo_dependencia.trim()) {
           showError({ title: "Campo obrigatório", description: "Nome do item é obrigatório." });
           setSaving(false);
           return;
         }
         const valorAdicNum = formData.tipo_valor === "unitario" && formData.valor_un_adic !== ""
           ? parseFloat(String(formData.valor_un_adic).replace(",", "."))
           : null;
         const payload = {
           empresa_id: empresa_id || null,
           tipo_dependencia: formData.tipo_dependencia,
           descricao: formData.descricao,
           valor_un_adic: !isNaN(valorAdicNum) && valorAdicNum !== null ? valorAdicNum : null,
           tipo_valor: formData.tipo_valor === "unitario",
           data_criacao: editingId ? undefined : new Date().toISOString(),
         };
         if (!editingId) {
           payload.codigo_dependencia = gerarProximoCodigo(dependencias, "D", "codigo_dependencia");
         }
         if (editingId) {
           await atualizar("config_dependencias", editingId, payload);
           showSuccess({ title: "Atualizado", description: "Item atualizado com sucesso." });
         } else {
           await criar("config_dependencias", empresa_id, payload);
           showSuccess({ title: "Sucesso", description: "Item adicionado com sucesso." });
         }
         queryClient.invalidateQueries({ queryKey: ["config-extras-dependencias"] });
      }

      resetForm();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      showError({ title: "Erro ao salvar", description: err.message });
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await softDelete(deleteTarget.tabela, deleteTarget.id);
      showSuccess({ title: "Removido", description: "Registro removido com sucesso." });
      queryClient.invalidateQueries({ queryKey: [`config-extras-${deleteTarget.tipo}`] });
    } catch (err) {
      showError({ title: "Erro ao remover", description: err.message });
    }
    setDeleteTarget(null);
  };

  // ── Handlers Estamparia ──
  const estampariaFormVazio = { descricao: "", tipo_parametro: [], valor: "", tempo: "", unidade: "", vinc_estamparia: [] };

  const handleEstampariaOpen = (item = null) => {
    if (item) {
      setEstampariaEditingId(item.id);
      setEstampariaForm({
        descricao: item.descricao || "",
        tipo_parametro: Array.isArray(item.tipo_parametro) ? item.tipo_parametro : [],
        valor: item.valor !== null && item.valor !== undefined ? String(item.valor) : "",
        tempo: item.tempo !== null && item.tempo !== undefined ? String(item.tempo) : "",
        unidade: item.unidade !== null && item.unidade !== undefined ? String(item.unidade) : "",
        vinc_estamparia: Array.isArray(item.vinc_estamparia) ? item.vinc_estamparia : [],
      });
    } else {
      setEstampariaEditingId(null);
      setEstampariaForm(estampariaFormVazio);
    }
    setEstampariaModal(true);
  };

  const handleEstampariaSave = async () => {
    if (!estampariaForm.descricao.trim()) {
      showError({ title: "Campo obrigatório", description: "Descrição é obrigatória." });
      return;
    }
    setSaving(true);
    try {
      const tipos = estampariaForm.tipo_parametro || [];
      const valorNum = tipos.includes("valor") && estampariaForm.valor !== ""
        ? parseFloat(String(estampariaForm.valor).replace(",", "."))
        : null;
      const tempoVal = tipos.includes("tempo") && estampariaForm.tempo !== ""
        ? parseInt(String(estampariaForm.tempo), 10)
        : null;
      const unidadeNum = tipos.includes("unidade") && estampariaForm.unidade !== ""
        ? parseInt(String(estampariaForm.unidade), 10)
        : null;

      const payload = {
        empresa_id,
        descricao: estampariaForm.descricao.trim(),
        tipo_parametro: tipos,
        valor: !isNaN(valorNum) && valorNum !== null ? valorNum : null,
        tempo: tempoVal || null,
        unidade: !isNaN(unidadeNum) && unidadeNum !== null ? unidadeNum : null,
        vinc_estamparia: Array.isArray(estampariaForm.vinc_estamparia) ? [...new Set(estampariaForm.vinc_estamparia)] : [],
      };

      if (estampariaEditingId) {
        payload.updated_at = new Date().toISOString();
        const res = await atualizar("config_estamparia", estampariaEditingId, payload);
        if (res?.error) { showError({ title: "Erro ao processar", description: res.error }); setSaving(false); return; }
        showSuccess({ title: "Sucesso", description: "Parâmetro salvo" });
      } else {
        payload.codigo = gerarCodigoPRM(estamparia);
        payload.created_at = new Date().toISOString();
        const res = await criar("config_estamparia", empresa_id, payload);
        if (res?.error) { showError({ title: "Erro ao processar", description: res.error }); setSaving(false); return; }
        showSuccess({ title: "Sucesso", description: "Parâmetro salvo" });
      }

      queryClient.invalidateQueries({ queryKey: ["config-extras-estamparia"] });
      setEstampariaModal(false);
      setEstampariaEditingId(null);
      setEstampariaForm(estampariaFormVazio);
    } catch (err) {
      showError({ title: "Erro ao processar", description: err.message });
    }
    setSaving(false);
  };

  // ── Handlers Tamanhos ──
  const gerarCodigoTamanho = (lista) => {
    const nums = lista.map(item => {
      const cod = item.codigo || "";
      if (cod.toUpperCase().startsWith("T")) return parseInt(cod.slice(1), 10);
      return 0;
    }).filter(n => !isNaN(n) && n > 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `T${String(max + 1).padStart(3, "0")}`;
  };

  const handleTamanhoOpen = (item = null) => {
    if (item) {
      setTamanhoEditingId(item.id);
      setTamanhoForm({ tamanho_abreviado: item.tamanho_abreviado || "", descricao: item.descricao || "", categoria: item.categoria || "" });
    } else {
      setTamanhoEditingId(null);
      setTamanhoForm({ tamanho_abreviado: "", descricao: "", categoria: "" });
    }
    setTamanhoModal(true);
  };

  const handleTamanhoSave = async () => {
    if (!tamanhoForm.tamanho_abreviado.trim()) {
      showError({ title: "Campo obrigatório", description: "Tamanho Abreviado é obrigatório." });
      return;
    }
    if (!tamanhoForm.descricao.trim()) {
      showError({ title: "Campo obrigatório", description: "Descrição é obrigatória." });
      return;
    }
    setSaving(true);
    try {
      if (tamanhoEditingId) {
        await atualizar("config_tamanhos", tamanhoEditingId, {
          tamanho_abreviado: tamanhoForm.tamanho_abreviado.trim().toUpperCase(),
          descricao: tamanhoForm.descricao.trim(),
          categoria: tamanhoForm.categoria || null,
          updated_at: new Date().toISOString(),
        });
        showSuccess({ title: "Atualizado", description: "Tamanho atualizado com sucesso." });
      } else {
        await criar("config_tamanhos", empresa_id, {
          codigo: gerarCodigoTamanho(tamanhos),
          tamanho_abreviado: tamanhoForm.tamanho_abreviado.trim().toUpperCase(),
          descricao: tamanhoForm.descricao.trim(),
          categoria: tamanhoForm.categoria || null,
          created_at: new Date().toISOString(),
        });
        showSuccess({ title: "Sucesso", description: "Tamanho adicionado com sucesso." });
      }
      queryClient.invalidateQueries({ queryKey: ["config-extras-tamanhos"] });
      setTamanhoModal(false);
      setTamanhoEditingId(null);
      setTamanhoForm({ tamanho_abreviado: "", descricao: "", categoria: "" });
    } catch (err) {
      showError({ title: "Erro ao salvar", description: err.message });
    }
    setSaving(false);
  };

  const handleTamanhoDelete = (id) => {
    showConfirm({
      title: "Deseja excluir?",
      description: "Ação irreversível",
      confirmLabel: "Excluir",
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await softDelete("config_tamanhos", id);
          showSuccess({ title: "Removido", description: "Tamanho removido com sucesso." });
          queryClient.invalidateQueries({ queryKey: ["config-extras-tamanhos"] });
        } catch (err) {
          showError({ title: "Erro ao remover", description: err.message });
        }
      },
    });
  };

  // ── Handlers Grades de Tamanho ──
  const handleGradeOpen = (item = null) => {
    if (item) {
      setGradeEditingId(item.id);
      setGradeForm({ nome_grade: item.nome_grade || "", ativo: item.ativo !== false });
    } else {
      setGradeEditingId(null);
      setGradeForm(gradeFormVazio);
    }
    setGradeModal(true);
  };

  const handleGradeSave = async () => {
    setGradeSaving(true);
    try {
      if (gradeEditingId) {
        await atualizarGrade(gradeEditingId, gradeForm);
        showSuccess({ title: "Atualizado", description: "Grade atualizada com sucesso." });
      } else {
        await criarGrade(gradeForm);
        showSuccess({ title: "Sucesso", description: "Grade criada com sucesso." });
      }
      setGradeModal(false);
      setGradeEditingId(null);
      setGradeForm(gradeFormVazio);
    } catch (err) {
      showError({ title: "Erro ao salvar", description: err.message });
    }
    setGradeSaving(false);
  };

  const handleGradeToggle = async (id, ativo) => {
    try {
      await toggleAtivoGrade(id, ativo);
      showSuccess({ title: "Atualizado", description: `Grade ${ativo ? "desativada" : "ativada"} com sucesso.` });
    } catch (err) {
      showError({ title: "Erro", description: err.message });
    }
  };

  const gradesFiltradas = grades.filter(g =>
    !gradeBusca.trim() || g.nome_grade?.toLowerCase().includes(gradeBusca.toLowerCase())
  );

  const handleEstampariaDelete = (id) => {
    if (vinculosEstamparia[id]) {
      showError({
        title: "Ação não permitida",
        description: "Este parâmetro está vinculado a orçamentos e não pode ser excluído.",
      });
      return;
    }
    showConfirm({
      title: "Deseja excluir?",
      description: "Ação irreversível",
      confirmLabel: "Excluir",
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await softDelete("config_estamparia", id);
          showSuccess({ title: "Removido", description: "Parâmetro removido com sucesso." });
          queryClient.invalidateQueries({ queryKey: ["config-extras-estamparia"] });
        } catch (err) {
          showError({ title: "Erro ao processar", description: err.message });
        }
      },
    });
  };

  const toggleTipoParametro = (tipo) => {
    setEstampariaForm(prev => {
      const lista = prev.tipo_parametro || [];
      return {
        ...prev,
        tipo_parametro: lista.includes(tipo) ? lista.filter(t => t !== tipo) : [...lista, tipo],
      };
    });
  };

  const toggleVincEstamparia = (vinc) => {
    setEstampariaForm(prev => {
      const lista = prev.vinc_estamparia || [];
      return {
        ...prev,
        vinc_estamparia: lista.includes(vinc) ? lista.filter(v => v !== vinc) : [...lista, vinc],
      };
    });
  };

  const VINC_ESTAMPARIA_OPCOES = [
    { key: "TP", label: "Total de prints" },
    { key: "TI", label: "Tempo de impressão" },
    { key: "TS", label: "Tempo de setup" },
    { key: "NL", label: "Número de limpezas" },
    { key: "TLI", label: "Tempo de limpeza de impressão" },
    { key: "TLF", label: "Tempo de limpeza final" },
    { key: "TTE", label: "Tempo total estimado" },
  ];

  const modalTitle = {
    acabamento: editingId ? "Editar Acabamento" : "Adicionar Acabamento",
    personalizacao: editingId ? "Editar Personalização" : "Adicionar Personalização",
    dependencia: editingId ? "Editar Item" : "Adicionar Item",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuração Extras</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie acabamentos especiais, tipos de personalização e dependências</p>
      </div>

      <Tabs defaultValue="acabamento" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="acabamento">Acabamentos Especiais</TabsTrigger>
          <TabsTrigger value="personalizacao">Tipos de Personalização</TabsTrigger>
          <TabsTrigger value="dependencia">Itens adicionais</TabsTrigger>
          <TabsTrigger value="estamparia">Parâmetros estamparia</TabsTrigger>
          <TabsTrigger value="tamanhos">Definição de Tamanhos</TabsTrigger>
          <TabsTrigger value="grades">Grades de Tamanho</TabsTrigger>
        </TabsList>

        {/* ABA 1 — ACABAMENTOS */}
        <TabsContent value="acabamento" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenModal("acabamento")} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Novo Acabamento
            </Button>
          </div>
          <TabelaRegistros
            loading={acabamentosQuery.isLoading}
            emptyMsg="Nenhum acabamento cadastrado"
            colunas={[
              { key: "codigo_acabamento", label: "Código", mono: true },
              { key: "nome_acabamento", label: "Nome" },
              { key: "descricao", label: "Descrição", muted: true },
              {
                key: "valor_acab_un",
                label: "Valor unitário",
                right: true,
                render: (item) => (
                  <span className="font-mono text-sm block text-right">
                    {item.valor_acab_un !== null && item.valor_acab_un !== undefined ? formatarValor(item.valor_acab_un) : "-"}
                  </span>
                ),
              },
              {
                key: "data_criacao",
                label: "Data Criação",
                muted: true,
                render: (item) => item.data_criacao ? new Date(item.data_criacao).toLocaleDateString("pt-BR") : "-",
              },
            ]}
            dados={acabamentos}
            onEditar={(item) => handleOpenModal("acabamento", item)}
            onDeletar={(id) => setDeleteTarget({ id, tabela: "config_acabamentos", tipo: "acabamentos" })}
          />
        </TabsContent>

        {/* ABA 2 — PERSONALIZAÇÕES */}
        <TabsContent value="personalizacao" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenModal("personalizacao")} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Nova Personalização
            </Button>
          </div>
          <TabelaRegistros
            loading={personalizacaoQuery.isLoading}
            emptyMsg="Nenhuma personalização cadastrada"
            colunas={[
              { key: "codigo_personalizacao", label: "Código", mono: true },
              { key: "tipo_personalizacao", label: "Tipo" },
              { key: "descricao", label: "Descrição", muted: true },
              {
                key: "impressao",
                label: "Impressão",
                render: (item) => {
                  const arr = item.impressao;
                  if (!arr || arr.length === 0) return <span className="text-slate-400">-</span>;
                  return arr.map(v => v === "digital" ? "Digital" : v === "silkscreen" ? "Silkscreen" : v).join(", ");
                },
              },
              {
                key: "valor_pers_un",
                label: "Valor fixo",
                right: true,
                render: (item) => (
                  <span className="font-mono text-sm block text-right">
                    {item.valor_pers_un !== null && item.valor_pers_un !== undefined ? formatarValor(item.valor_pers_un) : ""}
                  </span>
                ),
              },
              {
                key: "data_criacao",
                label: "Data Criação",
                muted: true,
                render: (item) => item.data_criacao ? new Date(item.data_criacao).toLocaleDateString("pt-BR") : "-",
              },
            ]}
            dados={personalizacoes}
            onEditar={(item) => handleOpenModal("personalizacao", item)}
            onDeletar={(id) => setDeleteTarget({ id, tabela: "config_personalizacao", tipo: "personalizacao" })}
          />
        </TabsContent>

        {/* ABA 3 — ITENS ADICIONAIS */}
        <TabsContent value="dependencia" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenModal("dependencia")} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Novo item
            </Button>
          </div>
          <TabelaRegistros
            loading={dependenciasQuery.isLoading}
            emptyMsg="Nenhum item adicional cadastrado"
            colunas={[
              { key: "codigo_dependencia", label: "Código", mono: true },
              { key: "tipo_dependencia", label: "Item" },
              { key: "descricao", label: "Descrição", muted: true },
              {
                key: "valor_un_adic",
                label: "Valor unitário",
                right: true,
                render: (item) => (
                  <span className="font-mono text-sm block text-right">
                    {item.valor_un_adic !== null && item.valor_un_adic !== undefined ? formatarValor(item.valor_un_adic) : "Variável"}
                  </span>
                ),
              },
              {
                key: "data_criacao",
                label: "Data Criação",
                muted: true,
                render: (item) => item.data_criacao ? new Date(item.data_criacao).toLocaleDateString("pt-BR") : "-",
              },
            ]}
            dados={dependencias}
            onEditar={(item) => handleOpenModal("dependencia", item)}
            onDeletar={(id) => setDeleteTarget({ id, tabela: "config_dependencias", tipo: "dependencias" })}
          />
        </TabsContent>
        {/* ABA 4 — PARÂMETROS ESTAMPARIA */}
        <TabsContent value="estamparia" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleEstampariaOpen()} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Novo parâmetro
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead className="text-right">Unidade</TableHead>
                  <TableHead className="text-center">Última Alteração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estampariaQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : estamparia.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Nenhum parâmetro cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  estamparia.map((item) => {
                    const vinculado = vinculosEstamparia[item.id] === true;
                    const t = formatarTempoMin(item.tempo);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-semibold">{item.codigo}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.descricao}
                            {vinculado && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Vinculado
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.valor && parseFloat(item.valor) !== 0
                            ? <span className="font-mono text-sm">R$ {formatarValor(item.valor)}</span>
                            : <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {t ? <span className="font-mono text-sm">{t}</span> : <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unidade && item.unidade !== 0
                            ? <span className="font-mono text-sm">{item.unidade}</span>
                            : <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-slate-500 text-center">
                          {item.updated_at ? new Date(item.updated_at).toLocaleDateString("pt-BR") : item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600" onClick={() => handleEstampariaOpen(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ABA 5 — TAMANHOS */}
        <TabsContent value="tamanhos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleTamanhoOpen()} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Novo Tamanho
            </Button>
          </div>
          <TabelaRegistros
            loading={tamanhosQuery.isLoading}
            emptyMsg="Nenhum tamanho cadastrado"
            colunas={[
              { key: "codigo", label: "Código", mono: true },
              { key: "tamanho_abreviado", label: "Tamanho Abreviado" },
              { key: "categoria", label: "Categoria", muted: true },
              { key: "descricao", label: "Descrição", muted: true },
              {
                key: "updated_at",
                label: "Criação / Edição",
                muted: true,
                render: (item) => {
                  const d = item.updated_at || item.created_at;
                  return d ? new Date(d).toLocaleDateString("pt-BR") : "-";
                },
              },
            ]}
            dados={tamanhos}
            onEditar={(item) => handleTamanhoOpen(item)}
            onDeletar={(id) => handleTamanhoDelete(id)}
          />
        </TabsContent>
        {/* ABA 6 — GRADES DE TAMANHO */}
        <TabsContent value="grades" className="space-y-6">
          {gradeSelecionada ? (
            <GradeItensPanel grade={gradeSelecionada} onVoltar={() => setGradeSelecionada(null)} />
          ) : (
            <>
              {/* Seção: Tamanhos Globais */}
              <TamanhosGlobaisPanel />

              {/* Divisor */}
              <div className="border-t border-slate-200 pt-2">
                <p className="text-sm font-semibold text-slate-700 mb-4">Grades de Tamanho</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Input
                  placeholder="Buscar grade..."
                  value={gradeBusca}
                  onChange={e => setGradeBusca(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={() => handleGradeOpen()} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Nova Grade
                </Button>
              </div>
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : gradesFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                          Nenhuma grade cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      gradesFiltradas.map((grade) => (
                        <TableRow key={grade.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setGradeSelecionada(grade)}>
                          <TableCell className="font-medium">{grade.nome_grade}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${grade.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                              {grade.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {grade.created_at ? new Date(grade.created_at).toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell className="text-right space-x-1" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-blue-600"
                              title={grade.ativo ? "Desativar" : "Ativar"}
                              onClick={() => handleGradeToggle(grade.id, grade.ativo)}
                            >
                              {grade.ativo
                                ? <ToggleRight className="h-4 w-4 text-green-500" />
                                : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600" onClick={() => handleGradeOpen(grade)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL GRADES DE TAMANHO */}
      <Dialog open={gradeModal} onOpenChange={(v) => { if (!v) { setGradeModal(false); setGradeEditingId(null); setGradeForm(gradeFormVazio); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{gradeEditingId ? "Editar Grade de Tamanho" : "Nova Grade de Tamanho"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Grade *</label>
              <Input
                value={gradeForm.nome_grade}
                onChange={e => setGradeForm(p => ({ ...p, nome_grade: e.target.value }))}
                placeholder="Ex: Grade Adulto P/M/G/GG"
                className="mt-1"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Ativo</label>
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={gradeForm.ativo}
                onChange={e => setGradeForm(p => ({ ...p, ativo: e.target.checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setGradeModal(false); setGradeEditingId(null); setGradeForm(gradeFormVazio); }} disabled={gradeSaving}>
              Cancelar
            </Button>
            <Button onClick={handleGradeSave} className="bg-blue-600 hover:bg-blue-700" disabled={gradeSaving}>
              {gradeSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : gradeEditingId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TAMANHOS */}
      <Dialog open={tamanhoModal} onOpenChange={(v) => { if (!v) { setTamanhoModal(false); setTamanhoEditingId(null); setTamanhoForm({ tamanho_abreviado: "", descricao: "" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tamanhoEditingId ? "Editar Tamanho" : "Novo Tamanho"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Código</label>
              <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-500">
                {tamanhoEditingId
                  ? (tamanhos.find(t => t.id === tamanhoEditingId)?.codigo || "—")
                  : gerarCodigoTamanho(tamanhos)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tamanho Abreviado * <span className="text-slate-400 font-normal">(máx. 3 caracteres)</span></label>
              <Input
                value={tamanhoForm.tamanho_abreviado}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
                  setTamanhoForm(p => ({ ...p, tamanho_abreviado: val }));
                }}
                maxLength={3}
                className="mt-1 font-mono uppercase"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={tamanhoForm.categoria}
                onChange={e => setTamanhoForm(p => ({ ...p, categoria: e.target.value }))}
                className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                <option value="Infantil">Infantil</option>
                <option value="Juvenil">Juvenil</option>
                <option value="Adulto">Adulto</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input
                value={tamanhoForm.descricao}
                onChange={e => setTamanhoForm(p => ({ ...p, descricao: e.target.value }))}
                className="mt-1"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTamanhoModal(false); setTamanhoEditingId(null); setTamanhoForm({ tamanho_abreviado: "", descricao: "", categoria: "" }); }} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleTamanhoSave} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : tamanhoEditingId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ESTAMPARIA */}
      <Dialog open={estampariaModal} onOpenChange={(v) => { if (!v) { setEstampariaModal(false); setEstampariaEditingId(null); setEstampariaForm(estampariaFormVazio || { descricao: "", tipo_parametro: [], valor: "", tempo: "", unidade: "" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{estampariaEditingId ? "Editar Parâmetro" : "Adicionar Parâmetro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Código (somente leitura) */}
            <div>
              <label className="text-sm font-medium text-slate-600">Código</label>
              <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-500">
                {estampariaEditingId
                  ? (estamparia.find(e => e.id === estampariaEditingId)?.codigo || "—")
                  : gerarCodigoPRM(estamparia)}
              </div>
            </div>
            {/* Descrição */}
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input
                value={estampariaForm.descricao}
                onChange={e => setEstampariaForm(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição do parâmetro"
                className="mt-1"
              />
            </div>
            {/* Vínculos de estamparia */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Vínculos de estamparia
                {estampariaEditingId && <span className="ml-2 text-xs font-normal text-slate-400">(não editável)</span>}
              </label>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
                {VINC_ESTAMPARIA_OPCOES.map(op => {
                  const sel = (estampariaForm.vinc_estamparia || []).includes(op.key);
                  return (
                    <label
                      key={op.key}
                      title={op.label}
                      className={`flex items-center gap-1.5 text-xs select-none ${estampariaEditingId ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-blue-600"
                        checked={sel}
                        onChange={() => !estampariaEditingId && toggleVincEstamparia(op.key)}
                        disabled={!!estampariaEditingId}
                      />
                      <span className={`font-mono font-semibold ${sel ? "text-blue-700" : "text-slate-600"}`}>
                        {op.key}
                      </span>
                    </label>
                  );
                })}
              </div>
              {(estampariaForm.vinc_estamparia || []).length > 0 && (
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {(estampariaForm.vinc_estamparia || []).map(k => {
                    const op = VINC_ESTAMPARIA_OPCOES.find(o => o.key === k);
                    return op ? `${op.key}: ${op.label}` : k;
                  }).join(" · ")}
                </p>
              )}
            </div>

            {/* Tipo de parâmetro — checkboxes horizontais */}
            <div>
              <label className="text-sm font-medium">
                Tipo de Parâmetro
                {estampariaEditingId && <span className="ml-2 text-xs font-normal text-slate-400">(não editável)</span>}
              </label>
              <div className="mt-2 flex gap-4">
                {["valor", "tempo", "unidade"].map(tipo => (
                  <label key={tipo} className={`flex items-center gap-2 text-sm capitalize ${estampariaEditingId ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={(estampariaForm.tipo_parametro || []).includes(tipo)}
                      onChange={() => !estampariaEditingId && toggleTipoParametro(tipo)}
                      disabled={!!estampariaEditingId}
                    />
                    {tipo}
                  </label>
                ))}
              </div>
            </div>
            {/* Campos dinâmicos */}
            {(estampariaForm.tipo_parametro || []).includes("valor") && (
              <div>
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={estampariaForm.valor}
                  onChange={e => setEstampariaForm(p => ({ ...p, valor: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}
            {(estampariaForm.tipo_parametro || []).includes("tempo") && (
              <div>
                <label className="text-sm font-medium">Tempo (minutos)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ex: 180"
                  value={estampariaForm.tempo}
                  onChange={e => setEstampariaForm(p => ({ ...p, tempo: e.target.value.replace(/\D/g, "") }))}
                  className="mt-1"
                />
              </div>
            )}
            {(estampariaForm.tipo_parametro || []).includes("unidade") && (
              <div>
                <label className="text-sm font-medium">Unidade (inteiro)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={estampariaForm.unidade}
                  onChange={e => setEstampariaForm(p => ({ ...p, unidade: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstampariaModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleEstampariaSave} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : estampariaEditingId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL */}
      <Dialog open={openModal} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalTitle[modalType]}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* ACABAMENTO */}
            {modalType === "acabamento" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Código do Acabamento</label>
                  <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-500">
                    {editingId
                      ? (acabamentos.find((a) => a.id === editingId)?.codigo_acabamento || "—")
                      : gerarProximoCodigo(acabamentos, "a", "codigo_acabamento")}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome do Acabamento *</label>
                  <Input
                    value={formData.nome_acabamento}
                    onChange={(e) => setFormData({ ...formData, nome_acabamento: e.target.value })}
                    placeholder="Ex: Bordado 3D"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Valor unitário</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_acab_un}
                    onChange={(e) => setFormData({ ...formData, valor_acab_un: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* PERSONALIZAÇÃO */}
            {modalType === "personalizacao" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Código da Personalização</label>
                  <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-500">
                    {editingId
                      ? (personalizacoes.find((p) => p.id === editingId)?.codigo_personalizacao || "—")
                      : gerarProximoCodigo(personalizacoes, "p", "codigo_personalizacao")}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Personalização *</label>
                  <Input
                    value={formData.tipo_personalizacao}
                    onChange={(e) => setFormData({ ...formData, tipo_personalizacao: e.target.value })}
                    placeholder="Ex: Silkscreen"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Valor unitário com enable/disable condicional */}
                <div>
                  <label className="text-sm font-medium">Valor unitário</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_pers_un}
                    onChange={(e) => setFormData({ ...formData, valor_pers_un: e.target.value })}
                    disabled={!formData.usa_valor_unitario}
                    className={`mt-1 transition-opacity ${!formData.usa_valor_unitario ? "opacity-40 bg-slate-100 cursor-not-allowed" : ""}`}
                  />
                  {!formData.usa_valor_unitario && (
                    <p className="text-xs text-slate-400 mt-1">Habilite o checkbox "Valor unitario" abaixo para editar este campo.</p>
                  )}
                </div>

                {/* Impressão */}
                <div>
                  <label className="text-sm font-medium text-slate-700">Impressão</label>
                  <div className="mt-1 border border-slate-200 rounded-md p-3 flex gap-4 bg-white">
                    {[{ value: "digital", label: "Digital" }, { value: "silkscreen", label: "Silkscreen" }].map(op => (
                      <label key={op.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-blue-600"
                          checked={(formData.impressao || []).includes(op.value)}
                          onChange={() => {
                            const atual = formData.impressao || [];
                            setFormData({
                              ...formData,
                              impressao: atual.includes(op.value)
                                ? atual.filter(v => v !== op.value)
                                : [...atual, op.value],
                            });
                          }}
                        />
                        {op.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Checkboxes de opções */}
                <div>
                  <label className="text-sm font-medium text-slate-700">Opções</label>
                  <div className="mt-1 border border-slate-200 rounded-md p-3 space-y-2 bg-white">
                    {OPCOES_PERS.map((op) => (
                      <label key={op.key} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-blue-600"
                          checked={!!formData[op.key]}
                          onChange={(e) => setFormData({ ...formData, [op.key]: e.target.checked })}
                        />
                        {op.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ITEM ADICIONAL */}
            {modalType === "dependencia" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Código do Item</label>
                  <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-500">
                    {editingId
                      ? (dependencias.find((d) => d.id === editingId)?.codigo_dependencia || "—")
                      : gerarProximoCodigo(dependencias, "D", "codigo_dependencia")}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome do Item *</label>
                  <Input
                    value={formData.tipo_dependencia}
                    onChange={(e) => setFormData({ ...formData, tipo_dependencia: e.target.value })}
                    placeholder="Ex: Tela específica"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                {/* Tipo de valor — radio exclusivo */}
                <div>
                  <label className="text-sm font-medium">Tipo de valor *</label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        className="accent-blue-600"
                        checked={formData.tipo_valor === "unitario"}
                        onChange={() => setFormData({ ...formData, tipo_valor: "unitario" })}
                      />
                      Valor unitário
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        className="accent-blue-600"
                        checked={formData.tipo_valor === "variavel"}
                        onChange={() => setFormData({ ...formData, tipo_valor: "variavel", valor_un_adic: "" })}
                      />
                      Valor variável
                    </label>
                  </div>
                </div>

                {/* Valor unitário — habilitado/desabilitado conforme tipo */}
                <div>
                  <label className="text-sm font-medium">Valor unitário</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_un_adic}
                    onChange={(e) => setFormData({ ...formData, valor_un_adic: e.target.value })}
                    disabled={formData.tipo_valor === "variavel"}
                    placeholder={formData.tipo_valor === "variavel" ? "Definido em tempo de cálculo" : "0,00"}
                    className={`mt-1 transition-opacity ${
                      formData.tipo_valor === "variavel" ? "opacity-40 bg-slate-100 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : editingId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja remover este registro? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            Remover
          </AlertDialogAction>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}