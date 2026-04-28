import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Copy, Loader2 } from "lucide-react";
import VincularProdutosTab from "@/components/fiscal/VincularProdutosTab";
import CodigoUnicoTab from "@/components/fiscal/CodigoUnicoTab";
import { toast } from "sonner";
import { supabase } from "@/components/lib/supabaseClient";
import { configTecidoService } from "@/components/services/configuracoesTecidoService";
import { useEmpresa } from "@/components/context/EmpresaContext";

const usarNovaArquitetura = true;





export default function ConfiguracaoTecidoPage() {
  const { empresa_id } = useEmpresa();
  const queryClient = useQueryClient();
  const { showDelete, showError, showSuccess } = useGlobalAlert();

  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [savingVinculo, setSavingVinculo] = useState(false);
  const [previewCodigo, setPreviewCodigo] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [searchTerms, setSearchTerms] = useState({ cor: "", artigo: "", linha: "", vinculo: "" });

  const [openTecidoModal, setOpenTecidoModal] = useState(false);
  const [savingTecido, setSavingTecido] = useState(false);
  const [editingTecidoId, setEditingTecidoId] = useState(null);
  const [tecidoForm, setTecidoForm] = useState({ artigo_id: '', cor_tecido_id: '', linha_comercial_id: '' });

  const [formDataState, setFormDataState] = useState({ cor_nome: "", hexadecimal: "", descricao: "", artigo_nome: "", linha_nome: "", artigo_id: "", cor_tecido_id: "", linha_comercial_id: "", descricao_base: "", descricao_complementar: "", codigo_pedido: "", fornecedor_id: "" });

  const coresQuery = useQuery({
    queryKey: ["config-tecido-cores", empresa_id, searchTerms.cor],
    queryFn: () => configTecidoService.listarCores(empresa_id, searchTerms.cor),
    enabled: !!empresa_id,
    staleTime: 60000,
  });
  const artigosQuery = useQuery({
    queryKey: ["config-tecido-artigos", empresa_id, searchTerms.artigo],
    queryFn: () => configTecidoService.listarArtigos(empresa_id, searchTerms.artigo),
    enabled: !!empresa_id,
    staleTime: 60000,
  });
  const linhasQuery = useQuery({
    queryKey: ["config-tecido-linhas", empresa_id, searchTerms.linha],
    queryFn: () => configTecidoService.listarLinhasComerciais(empresa_id, searchTerms.linha),
    enabled: !!empresa_id,
    staleTime: 60000,
  });
  const vinculosQuery = useQuery({
    queryKey: ["config-tecido-vinculos", empresa_id, searchTerms.vinculo],
    queryFn: () => configTecidoService.listarVinculos(empresa_id, searchTerms.vinculo),
    enabled: !!empresa_id,
    staleTime: 60000,
  });

  const coresArray = (coresQuery.data || []).filter(c => !c.deleted_at);
  const artigosArray = (artigosQuery.data || []).filter(a => !a.deleted_at);
  const linhasArray = (linhasQuery.data || []).filter(l => !l.deleted_at);
  const vinculosArray = (vinculosQuery.data || []).filter(v => !v.deleted_at);


  // --- MUTATIONS ---
  const createCorMutation = useMutation({
    mutationFn: (data) => configTecidoService.criarCor({ ...data, empresa_id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-cores"] }); toast.success("Cor adicionada!"); resetForm(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateCorMutation = useMutation({
    mutationFn: (data) => configTecidoService.atualizarCor(editingId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-cores"] }); toast.success("Cor atualizada!"); resetForm(); },
    onError: () => toast.error("Erro ao atualizar cor"),
  });
  const deleteCorMutation = useMutation({
    mutationFn: (id) => configTecidoService.softDeletarCor(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-cores"] }); toast.success("Cor inativada!"); },
    onError: (e) => showError({ title: 'Ação não permitida', message: e?.response?.data?.error || 'Esta cor está em uso e não pode ser excluída.' }),
  });

  const createArtigoMutation = useMutation({
    mutationFn: (data) => configTecidoService.criarArtigo({ ...data, empresa_id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-artigos"] }); toast.success("Artigo adicionado!"); resetForm(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateArtigoMutation = useMutation({
    mutationFn: (data) => configTecidoService.atualizarArtigo(editingId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-artigos"] }); toast.success("Artigo atualizado!"); resetForm(); },
    onError: () => toast.error("Erro ao atualizar artigo"),
  });
  const deleteArtigoMutation = useMutation({
    mutationFn: (id) => configTecidoService.deletarArtigo(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-artigos"] }); toast.success("Artigo inativado!"); },
    onError: (e) => showError({ title: 'Ação não permitida', message: e?.response?.data?.error || 'Este artigo está em uso e não pode ser excluído.' }),
  });

  const createLinhaMutation = useMutation({
    mutationFn: (data) => configTecidoService.criarLinhaComercial({ ...data, empresa_id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-linhas"] }); toast.success("Linha comercial adicionada!"); resetForm(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateLinhaMutation = useMutation({
    mutationFn: (data) => configTecidoService.atualizarLinhaComercial(editingId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-linhas"] }); toast.success("Linha comercial atualizada!"); resetForm(); },
    onError: () => toast.error("Erro ao atualizar linha comercial"),
  });
  const deleteLinhaMutation = useMutation({
    mutationFn: (id) => configTecidoService.deletarLinhaComercial(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-linhas"] }); toast.success("Linha comercial inativada!"); },
    onError: (e) => showError({ title: 'Ação não permitida', message: e?.response?.data?.error || 'Esta linha está em uso e não pode ser excluída.' }),
  });

  const deleteVinculoMutation = useMutation({
    mutationFn: (id) => configTecidoService.deletarVinculo(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["config-tecido-vinculos"] }); toast.success("Vínculo inativado!"); },
    onError: (e) => showError({ title: 'Ação não permitida', message: e?.response?.data?.error || 'Este vínculo está em uso e não pode ser excluído.' }),
  });

  const resetForm = () => {
    setFormDataState({ cor_nome: "", hexadecimal: "", descricao: "", artigo_nome: "", linha_nome: "", artigo_id: "", cor_tecido_id: "", linha_comercial_id: "", descricao_base: "", descricao_complementar: "", codigo_pedido: "", fornecedor_id: "" });
    setEditingId(null);
    setOpenModal(false);
    setPreviewCodigo(null);
    setPreviewError(null);
  };

  // Preview do código único
  useEffect(() => {
    if (modalType !== "vinculo") return;
    const { artigo_id, cor_tecido_id, linha_comercial_id } = formDataState;
    if (!artigo_id || !cor_tecido_id || !linha_comercial_id) {
      setPreviewCodigo(null);
      setPreviewError(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    const artigo = artigosArray.find(a => a.id === artigo_id);
    const cor = coresArray.find(c => c.id === cor_tecido_id);
    const linha = linhasArray.find(l => l.id === linha_comercial_id);
    if (artigo && cor && linha) {
      const codigo = `${artigo.codigo_artigo || artigo.id}${cor.codigo_cor || cor.id}${linha.codigo_linha_comercial || linha.id}`;
      const dup = (vinculosArray || []).find(v => v.codigo_unico === codigo && v.id !== editingId);
      if (dup) {
        setPreviewError(`Combinação já existente: ${codigo}`);
        setPreviewCodigo(null);
      } else {
        setPreviewCodigo(codigo);
      }
    } else {
      setPreviewCodigo(null);
    }
    setPreviewLoading(false);
  }, [formDataState.artigo_id, formDataState.cor_tecido_id, formDataState.linha_comercial_id, modalType]);

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    if (item) { setEditingId(item.id); setFormDataState(item); }
    setOpenModal(true);
  };

  const handleSaveForm = async () => {
    if (!modalType) return;

    if (modalType === "cor") {
      if (!formDataState.nome_cor.trim()) { toast.error("Nome da cor é obrigatório"); return; }
      if (editingId) updateCorMutation.mutate({ cor_nome: formDataState.cor_nome, hexadecimal: formDataState.hexadecimal || null, descricao: formDataState.descricao });
      else createCorMutation.mutate({ cor_nome: formDataState.cor_nome, hexadecimal: formDataState.hexadecimal || null, descricao: formDataState.descricao });

    } else if (modalType === "artigo") {
      if (!formDataState.artigo_nome.trim()) { toast.error("Nome do artigo é obrigatório"); return; }
      if (editingId) updateArtigoMutation.mutate({ artigo_nome: formDataState.artigo_nome, descricao: formDataState.descricao });
      else createArtigoMutation.mutate({ artigo_nome: formDataState.artigo_nome, descricao: formDataState.descricao });

    } else if (modalType === "linha") {
      if (!formDataState.linha_nome.trim()) { toast.error("Nome da linha comercial é obrigatório"); return; }
      if (editingId) updateLinhaMutation.mutate({ linha_nome: formDataState.linha_nome, descricao: formDataState.descricao });
      else createLinhaMutation.mutate({ linha_nome: formDataState.linha_nome, descricao: formDataState.descricao });

    } else if (modalType === "vinculo") {
      if (!formDataState.artigo_id || !formDataState.cor_tecido_id || !formDataState.linha_comercial_id) {
        toast.error("Todos os campos são obrigatórios"); return;
      }
      if (!previewCodigo) { toast.error("Aguarde a geração do código único"); return; }

      setSavingVinculo(true);
      const artigo = artigosArray.find(a => a.id === formDataState.artigo_id);
      const cor = coresArray.find(c => c.id === formDataState.cor_tecido_id);
      const linha = linhasArray.find(l => l.id === formDataState.linha_comercial_id);
      const descricaoComercialUnificada = [artigo?.artigo_nome || '', cor?.cor_nome || ''].filter(Boolean).join(' ') || null;
      try {
          const { error } = await supabase.from('config_vinculos').insert({
            empresa_id,
            codigo_unico: previewCodigo,
            artigo_nome: artigo?.artigo_nome || '',
            cor_nome: cor?.cor_nome || '',
            linha_nome: linha?.linha_nome || '',
            artigo_codigo: artigo?.codigo_artigo || null,
            cor_codigo: cor?.codigo_cor || null,
            linha_codigo: linha?.codigo_linha_comercial || null,
            descricao_comercial_unificada: descricaoComercialUnificada,
            descricao_base: formDataState.descricao_base || '',
            descricao_complementar: formDataState.descricao_complementar || '',
            fornecedor_id: formDataState.fornecedor_id || null,
          });
          if (error) throw new Error(error.message);
        queryClient.invalidateQueries({ queryKey: ["config-tecido-vinculos"] });
        toast.success("Vínculo criado com sucesso!");
        resetForm();
      } catch (error) {
        toast.error(`Erro ao criar vínculo: ${error.message}`);
      } finally {
        setSavingVinculo(false);
      }
    }
  };

  const gerarCodigoUnico = (artigo_id, cor_tecido_id, linha_comercial_id) => {
    const artigo = artigosArray.find(a => a.id === artigo_id);
    const cor = coresArray.find(c => c.id === cor_tecido_id);
    const linha = linhasArray.find(l => l.id === linha_comercial_id);
    if (!artigo || !cor || !linha) return null;
    return `${artigo.codigo_artigo || artigo.id}${cor.codigo_cor || cor.id}${linha.codigo_linha_comercial || linha.id}`;
  };

  const handleOpenTecidoModal = (item = null) => {
    if (item) {
      setEditingTecidoId(item.id);
      setTecidoForm({ artigo_id: item.artigo_id, cor_tecido_id: item.cor_tecido_id, linha_comercial_id: item.linha_comercial_id });
    } else {
      setEditingTecidoId(null);
      setTecidoForm({ artigo_id: '', cor_tecido_id: '', linha_comercial_id: '' });
    }
    setOpenTecidoModal(true);
  };

  const handleSaveTecido = async () => {
    const { artigo_id, cor_tecido_id, linha_comercial_id } = tecidoForm;
    if (!artigo_id || !cor_tecido_id || !linha_comercial_id) {
      showError({ title: 'Campos obrigatórios', message: 'Selecione artigo, cor e linha comercial.' });
      return;
    }
    const codigo_unico = gerarCodigoUnico(artigo_id, cor_tecido_id, linha_comercial_id);
    if (!codigo_unico) {
      showError({ title: 'Erro', message: 'Não foi possível gerar o código único.' });
      return;
    }
    const duplicadoPorCodigo = (vinculosArray || []).find(t =>
      t.codigo_unico === codigo_unico && t.id !== editingTecidoId
    );
    if (duplicadoPorCodigo) {
      showError({ title: 'Código já cadastrado', message: `O código único "${codigo_unico}" já existe. Verifique a combinação de artigo, cor e linha comercial.` });
      return;
    }
    setSavingTecido(true);
    const artigo = artigosArray.find(a => a.id === artigo_id);
    const cor = coresArray.find(c => c.id === cor_tecido_id);
    const linha = linhasArray.find(l => l.id === linha_comercial_id);
    
    // Gera descricao_comercial_unificada concatenando artigo + cor
    const descricaoComercialUnificada = [artigo?.artigo_nome || '', cor?.cor_nome || ''].filter(Boolean).join(' ') || null;
    
    try {
      if (editingTecidoId) {
        // Usa service para update
        await configTecidoService.atualizarVinculo(editingTecidoId, {
          artigo_nome: artigo?.nome_artigo || '',
          cor_nome: cor?.nome_cor || '',
          linha_nome: linha?.nome_linha_comercial || '',
          artigo_codigo: artigo?.codigo_artigo || null,
          cor_codigo: cor?.codigo_cor || null,
          linha_codigo: linha?.codigo_linha_comercial || null,
          descricao_comercial_unificada: descricaoComercialUnificada,
        });
      } else {
        // Usa função backend especifica para inserir
        const { error } = await supabase.from('config_vinculos').insert({
          empresa_id,
          codigo_unico,
          artigo_nome: artigo?.artigo_nome || '',
          cor_nome: cor?.cor_nome || '',
          linha_nome: linha?.linha_nome || '',
          artigo_codigo: artigo?.codigo_artigo || null,
          cor_codigo: cor?.codigo_cor || null,
          linha_codigo: linha?.codigo_linha_comercial || null,
          descricao_comercial_unificada: descricaoComercialUnificada,
        });
        if (error) throw new Error(error.message);
      }
      // Invalida queries para recarregar tabela de códigos e produtos disponíveis no card amarelo
      queryClient.invalidateQueries({ queryKey: ["config-tecido-vinculos"] });
      showSuccess({ title: editingTecidoId ? 'Atualizado' : 'Cadastrado', message: `Código ${codigo_unico} ${editingTecidoId ? 'atualizado' : 'criado'} com sucesso!` });
      // vínculo inteligente agora é persistido no backend (salvarVinculoTecido)
      setTecidoForm({ artigo_id: '', cor_tecido_id: '', linha_comercial_id: '' });
      setEditingTecidoId(null);
      setOpenTecidoModal(false);
    } catch (error) {
      showError({ title: 'Erro ao salvar', message: error.message });
    } finally {
      setSavingTecido(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const isSaving = createCorMutation.isPending || updateCorMutation.isPending ||
    createArtigoMutation.isPending || updateArtigoMutation.isPending ||
    createLinhaMutation.isPending || updateLinhaMutation.isPending || savingVinculo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuração do Tecido</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie cores, artigos, linhas comerciais e vínculos de produtos</p>
      </div>

      <Tabs defaultValue="artigo" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="artigo">Artigo</TabsTrigger>
          <TabsTrigger value="linha">Linha Comercial</TabsTrigger>
          <TabsTrigger value="cor">Cor do Tecido</TabsTrigger>
          <TabsTrigger value="vinculo">Códigos e Vínculo</TabsTrigger>
        </TabsList>

        {/* ABA COR */}
        <TabsContent value="cor" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input placeholder="Buscar cor..." value={searchTerms.cor} onChange={(e) => setSearchTerms({ ...searchTerms, cor: e.target.value })} className="max-w-xs" />
            <Button onClick={() => handleOpenModal("cor")} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Nova Cor
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome da Cor</TableHead>
                  <TableHead>Hexadecimal</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coresQuery.isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                ) : coresArray.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma cor cadastrada</TableCell></TableRow>
                ) : coresArray.map((cor) => (
                  <TableRow key={cor.id}>
                    <TableCell className="font-mono font-semibold">{cor.codigo_cor}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: cor.hexadecimal || "#e2e8f0" }} />
                        <span className="font-medium">{cor.cor_nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 font-mono text-xs">{cor.hexadecimal || "-"}</TableCell>
                    <TableCell className="text-slate-500">{cor.descricao || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => handleOpenModal("cor", cor)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => showDelete({ onConfirm: () => deleteCorMutation.mutateAsync(cor.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ABA ARTIGO */}
        <TabsContent value="artigo" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input placeholder="Buscar artigo..." value={searchTerms.artigo} onChange={(e) => setSearchTerms({ ...searchTerms, artigo: e.target.value })} className="max-w-xs" />
            <Button onClick={() => handleOpenModal("artigo")} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Novo Artigo
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome do Artigo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artigosQuery.isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                ) : artigosArray.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhum artigo cadastrado</TableCell></TableRow>
                ) : artigosArray.map((artigo) => (
                 <TableRow key={artigo.id}>
                   <TableCell className="font-mono font-semibold">{artigo.codigo_artigo}</TableCell>
                   <TableCell className="font-medium">{artigo.artigo_nome}</TableCell>
                    <TableCell className="text-slate-500">{artigo.descricao || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => handleOpenModal("artigo", artigo)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => showDelete({ onConfirm: () => deleteArtigoMutation.mutateAsync(artigo.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ABA LINHA COMERCIAL */}
        <TabsContent value="linha" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input placeholder="Buscar linha comercial..." value={searchTerms.linha} onChange={(e) => setSearchTerms({ ...searchTerms, linha: e.target.value })} className="max-w-xs" />
            <Button onClick={() => handleOpenModal("linha")} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Nova Linha
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Linha Comercial</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasQuery.isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                ) : linhasArray.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhuma linha comercial cadastrada</TableCell></TableRow>
                ) : linhasArray.map((linha) => (
                 <TableRow key={linha.id}>
                   <TableCell className="font-mono font-semibold">{linha.codigo_linha_comercial}</TableCell>
                   <TableCell className="font-medium">{linha.linha_nome}</TableCell>
                    <TableCell className="text-slate-500">{linha.descricao || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => handleOpenModal("linha", linha)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => showDelete({ onConfirm: () => deleteLinhaMutation.mutateAsync(linha.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ABA CÓDIGOS E VÍNCULO */}
        <TabsContent value="vinculo" className="space-y-6">
          {/* Seção Códigos Únicos */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Códigos Únicos</h2>
                <p className="text-xs text-slate-500 mt-1">Gerencie códigos de produtos vinculando artigos, cores e linhas comerciais</p>
              </div>
              <Button onClick={() => { setEditingTecidoId(null); setTecidoForm({ artigo_id: '', cor_tecido_id: '', linha_comercial_id: '' }); setOpenTecidoModal(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Novo Código
              </Button>
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código Único</TableHead>
                    <TableHead>Artigo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Linha</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculosQuery.isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                  ) : vinculosArray.filter(v => !v.deleted_at).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum código cadastrado</TableCell></TableRow>
                  ) : vinculosArray.filter(v => !v.deleted_at).map((vinculo) => (
                    <TableRow key={vinculo.id}>
                      <TableCell className="font-mono font-semibold text-blue-700">{vinculo.codigo_unico}</TableCell>
                      <TableCell>{vinculo.artigo_nome || '—'}</TableCell>
                      <TableCell>{vinculo.cor_nome || '—'}</TableCell>
                      <TableCell>{vinculo.linha_nome || '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => { setEditingTecidoId(vinculo.id); setTecidoForm({ artigo_id: vinculo.artigo_id, cor_tecido_id: vinculo.cor_tecido_id, linha_comercial_id: vinculo.linha_comercial_id }); setOpenTecidoModal(true); }}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                      </TableRow>
                      ))
                      }
                      </TableBody>
              </Table>
            </Card>
          </div>

          {/* Seção Vincular Produtos */}
          <div className="border-t pt-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Vincular Itens Não Vinculados</h2>
              <p className="text-xs text-slate-500 mt-1">Selecione itens de notas fiscais e vincule-os a produtos cadastrados</p>
            </div>
            <VincularProdutosTab empresa_id={empresa_id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL CÓDIGO ÚNICO */}
      <Dialog open={openTecidoModal} onOpenChange={(open) => { if (!open) { setEditingTecidoId(null); setTecidoForm({ artigo_id: '', cor_tecido_id: '', linha_comercial_id: '' }); } setOpenTecidoModal(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTecidoId ? 'Editar Código Único' : 'Novo Código Único'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Artigo *</label>
              <Select value={tecidoForm.artigo_id} onValueChange={(v) => setTecidoForm({ ...tecidoForm, artigo_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{artigosArray.map(a => <SelectItem key={a.id} value={a.id}>{a.artigo_nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Cor do Tecido *</label>
              <Select value={tecidoForm.cor_tecido_id} onValueChange={(v) => setTecidoForm({ ...tecidoForm, cor_tecido_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{coresArray.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cor}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Linha Comercial *</label>
              <Select value={tecidoForm.linha_comercial_id} onValueChange={(v) => setTecidoForm({ ...tecidoForm, linha_comercial_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{linhasArray.map(l => <SelectItem key={l.id} value={l.id}>{l.linha_nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Descrição Comercial Unificada</label>
              <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm">
                {(() => {
                  const artigo = artigosArray.find(a => a.id === tecidoForm.artigo_id);
                  const cor = coresArray.find(c => c.id === tecidoForm.cor_tecido_id);
                  const descricao = [artigo?.nome_artigo || '', cor?.nome_cor || ''].filter(Boolean).join(' ');
                  return descricao ? <span className="text-slate-900 font-medium">{descricao}</span> : <span className="text-slate-400">Selecione artigo e cor para gerar</span>;
                })()}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Código Único (gerado automaticamente)</label>
              <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono">
                {gerarCodigoUnico(tecidoForm.artigo_id, tecidoForm.cor_tecido_id, tecidoForm.linha_comercial_id)
                  ? <span className="font-bold text-blue-700">{gerarCodigoUnico(tecidoForm.artigo_id, tecidoForm.cor_tecido_id, tecidoForm.linha_comercial_id)}</span>
                  : <span className="text-slate-400">Selecione artigo, cor e linha para gerar</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTecidoModal(false)} disabled={savingTecido}>Cancelar</Button>
            <Button onClick={handleSaveTecido} className="bg-blue-600 hover:bg-blue-700" disabled={savingTecido}>
              {savingTecido ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : editingTecidoId ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL FORMULÁRIO */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar" : "Adicionar"}{" "}
              {modalType === "cor" ? "Cor" : modalType === "artigo" ? "Artigo" : modalType === "linha" ? "Linha Comercial" : "Vínculo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {modalType === "cor" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Código da Cor</label>
                  <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-600">Gerado automaticamente</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nome da Cor *</label>
                    <Input value={formDataState.cor_nome} onChange={(e) => setFormDataState({ ...formDataState, cor_nome: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hexadecimal</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-9 w-9 rounded-md border border-slate-200 shrink-0" style={{ backgroundColor: formDataState.hexadecimal || "#e2e8f0" }} />
                      <Input value={formDataState.hexadecimal || ""} onChange={(e) => setFormDataState({ ...formDataState, hexadecimal: e.target.value })} maxLength={7} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea value={formDataState.descricao} onChange={(e) => setFormDataState({ ...formDataState, descricao: e.target.value })} className="mt-1" rows={3} />
                </div>
              </>
            )}

            {modalType === "artigo" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Código do Artigo</label>
                  <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-600">Gerado automaticamente</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome do Artigo *</label>
                  <Input value={formDataState.artigo_nome} onChange={(e) => setFormDataState({ ...formDataState, artigo_nome: e.target.value })} placeholder="Ex: Algodão 100%" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea value={formDataState.descricao} onChange={(e) => setFormDataState({ ...formDataState, descricao: e.target.value })} className="mt-1" rows={3} />
                </div>
              </>
            )}

            {modalType === "linha" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Código da Linha Comercial</label>
                  <div className="mt-1 px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-600">Gerado automaticamente</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Linha Comercial *</label>
                  <Input value={formDataState.linha_nome} onChange={(e) => setFormDataState({ ...formDataState, linha_nome: e.target.value })} placeholder="Ex: Premium" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea value={formDataState.descricao} onChange={(e) => setFormDataState({ ...formDataState, descricao: e.target.value })} className="mt-1" rows={3} />
                </div>
              </>
            )}

            {modalType === "vinculo" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Código Único</label>
                  <div className={`mt-1 px-3 py-2 rounded text-sm font-mono ${previewError ? 'bg-red-50 text-red-600 border border-red-300' : previewCodigo ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-slate-100 text-slate-500'}`}>
                    {previewLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Gerando...</span>
                    ) : previewError ? previewError : previewCodigo ? previewCodigo : "Selecione artigo, cor e linha para gerar"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Artigo *</label>
                  <Select value={formDataState.artigo_id} onValueChange={(value) => setFormDataState({ ...formDataState, artigo_id: value })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{artigosArray.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome_artigo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Cor do Tecido *</label>
                  <Select value={formDataState.cor_tecido_id} onValueChange={(value) => setFormDataState({ ...formDataState, cor_tecido_id: value })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{coresArray.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_cor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                   <label className="text-sm font-medium">Linha Comercial *</label>
                   <Select value={formDataState.linha_comercial_id} onValueChange={(value) => setFormDataState({ ...formDataState, linha_comercial_id: value })}>
                     <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                     <SelectContent>{linhasArray.map((l) => <SelectItem key={l.id} value={l.id}>{l.linha_nome}</SelectItem>)}</SelectContent>
                   </Select>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-slate-600">Descrição Comercial Unificada</label>
                   <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm">
                     {(() => {
                       const artigo = artigosArray.find(a => a.id === formDataState.artigo_id);
                       const cor = coresArray.find(c => c.id === formDataState.cor_tecido_id);
                       const descricao = [artigo?.artigo_nome || '', cor?.cor_nome || ''].filter(Boolean).join(' ');
                       return descricao ? <span className="text-slate-900 font-medium">{descricao}</span> : <span className="text-slate-400">Selecione artigo e cor para gerar</span>;
                     })()}
                   </div>
                 </div>
                 <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Critérios de Matching XML</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Descrição Base (xProd)</label>
                      <Input value={formDataState.descricao_base} onChange={(e) => setFormDataState({ ...formDataState, descricao_base: e.target.value })} placeholder="Descrição principal do item no XML" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Descrição Complementar (infAdProd)</label>
                      <Input value={formDataState.descricao_complementar} onChange={(e) => setFormDataState({ ...formDataState, descricao_complementar: e.target.value })} placeholder="Descrição complementar do XML" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">CNPJ Fornecedor</label>
                      <Input value={formDataState.fornecedor_id} onChange={(e) => setFormDataState({ ...formDataState, fornecedor_id: e.target.value })} placeholder="CNPJ do emitente" className="mt-1" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={isSaving}>Cancelar</Button>
            <Button
              onClick={handleSaveForm}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSaving || !!previewError || (modalType === "vinculo" && previewLoading)}
            >
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : editingId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}