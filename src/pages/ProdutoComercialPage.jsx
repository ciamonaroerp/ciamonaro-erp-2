import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, X, Search, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import RendimentosTabSimplificado from "@/components/comercial/RendimentosTabSimplificado";
import ComposicaoPecaTab from "@/components/comercial/ComposicaoPecaTab";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { cn } from "@/lib/utils";
import { ErpTableContainer } from "@/components/design-system";
import { sincronizarTabelaPrecos } from "@/utils/sincronizarTabelaPrecos";

const EMPTY = { nome_produto: "", descricao: "", status: "Ativo", variáveis: 1, categorias_tamanho: [] };

const CATEGORIAS_TAMANHO = ["Infantil", "Juvenil", "Adulto"];

async function fetchProdutos(empresa_id) {
  if (!empresa_id) return [];
  const { data } = await supabase
    .from('produto_comercial')
    .select('*')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null)
    .order('codigo_produto', { ascending: true });
  return data || [];
}

async function fetchArtigos(produto_id) {
  const { data } = await supabase
    .from('produto_comercial_artigo')
    .select('*')
    .eq('produto_id', produto_id)
    .is('deleted_at', null);
  return data || [];
}

async function fetchVinculos(empresa_id) {
  if (!empresa_id) return [];
  const { data } = await supabase
    .from('config_vinculos')
    .select('*')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null)
    .not('codigo_unico', 'is', null);
  return (data || []).map(v => ({
    ...v,
    artigo_nome: v.artigo_nome || '',
    cor_nome: v.cor_nome || '',
    linha_nome: v.linha_nome || '',
  }));
}

async function createProduto(empresa_id, payload, createdBy) {
  if (!empresa_id) throw new Error('Empresa ID obrigatório');
  const { data, error } = await supabase
    .from('produto_comercial')
    .insert({ ...payload, empresa_id, created_by: createdBy })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data || {};
}

async function updateProduto(id, payload) {
  const { data, error } = await supabase
    .from('produto_comercial')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data || {};
}

async function deleteProduto(id) {
  await supabase
    .from('produto_comercial')
    .update({ status: 'Inativo', deleted_at: new Date().toISOString() })
    .eq('id', id);
}

async function createArtigo(empresa_id, produto_id, artigoData, createdBy) {
   const { data, error } = await supabase
     .from('produto_comercial_artigo')
     .insert({
       produto_id,
       empresa_id,
       created_by: createdBy,
       vinculo_id: artigoData.vinculo_id,
       codigo_unico: artigoData.codigo_unico,
       artigo_codigo: artigoData.artigo_codigo || null,
       variavel_index: artigoData.variavel_index ?? 1,
       status_rendimento: "pendente",
     })
     .select()
     .single();
   if (error) throw new Error(error.message);
   return data || {};
}

async function deleteArtigo(id) {
  await supabase
    .from('produto_comercial_artigo')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
}

function parseArtigo(raw) {
  try { return JSON.parse(raw); } catch { return { display: raw }; }
}

export default function ProdutoComercialPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showError, showDelete, showSuccess } = useGlobalAlert();
  const [userEmail, setUserEmail] = React.useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [vinculoSearchPorVar, setVinculoSearchPorVar] = useState({});
  const [showDropdownPorVar, setShowDropdownPorVar] = useState({});
  const [composicoesPorVariavel, setComposicoesPorVariavel] = useState({});
  const [composicaoSearch, setComposicaoSearch] = useState("");
  const [itemsPendentes, setItemsPendentes] = useState(false);
  const [multiComposicoes, setMultiComposicoes] = useState([]);

  React.useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) setUserEmail(data.user.email);
    };
    getUser();
  }, []);

  const initMultiComposicoes = (numVariaveis, existentes = []) => {
    const arr = Array.from({ length: numVariaveis }, (_, i) => {
      const ex = existentes.find(c => c.indice === i + 1);
      return ex || { indice: i + 1, codigo_unico: "", artigo_nome: "", cor_nome: "", artigo_codigo: "", consumo_un: "", custo_kg: "", custo_un: "" };
    });
    setMultiComposicoes(arr);
  };
  const { data: produtos = [] } = useQuery({
    queryKey: ["produto-comercial", empresa_id],
    queryFn: () => fetchProdutos(empresa_id),
    enabled: !!empresa_id,
    staleTime: 60000,
  });

  // Busca todos os preços para calcular status "Pendente" na listagem
  const { data: todosPrecosSync = [] } = useQuery({
    queryKey: ["tabela-precos-sync-all", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const { data } = await supabase
        .from('tabela_precos_sync')
        .select('produto_id, consumo_un, custo_kg')
        .eq('empresa_id', empresa_id);
      return data || [];
    },
    enabled: !!empresa_id,
    staleTime: 30000,
  });

  // Set de produto_ids que têm algum item com consumo_un=0 ou custo_kg=0
  const produtosComPendencia = useMemo(() => {
    const set = new Set();
    todosPrecosSync.forEach(p => {
      if ((parseFloat(p.consumo_un) || 0) === 0 || (parseFloat(p.custo_kg) || 0) === 0) {
        set.add(p.produto_id);
      }
    });
    return set;
  }, [todosPrecosSync]);

  const { data: artigos = [] } = useQuery({
    queryKey: ["produto-comercial-artigos", editingId],
    queryFn: () => fetchArtigos(editingId),
    enabled: !!editingId,
    staleTime: 60000,
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ["config-vinculos-produto", empresa_id],
    queryFn: () => fetchVinculos(empresa_id),
    enabled: !!modalOpen,
    staleTime: 60000,
  });

  // (init_produto_composicao removido — tabelas criadas via migration)

  // Carrega dados de custo/consumo das composições diretamente da tabela_precos_sync
  // Filtrado apenas pelos artigos vinculados (produto_comercial_artigo)
  const { data: artigosPrecosSync = [] } = useQuery({
    queryKey: ["tabela-precos-sync-produto", editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data } = await supabase
        .from('tabela_precos_sync')
        .select('codigo_unico, artigo_nome, cor_nome, linha_nome, consumo_un, custo_kg, custo_un, rendimento_valor')
        .eq('produto_id', editingId);
      return data || [];
    },
    enabled: !!editingId && !!modalOpen,
    staleTime: 0,
  });

  // Filtra artigosPrecosSync apenas pelos artigos efetivamente selecionados (vinculados)
  const artigosPrecosFiltered = useMemo(() => {
    const codigosVinculados = new Set(artigos.map(a => a.codigo_unico).filter(Boolean));
    return artigosPrecosSync.filter(a => codigosVinculados.has(a.codigo_unico));
  }, [artigosPrecosSync, artigos]);

  // Refetch dos preços quando abre modal ou muda produto
  useEffect(() => {
    if (editingId && modalOpen) {
      const timer = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["tabela-precos-sync-produto", editingId] });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editingId, modalOpen, qc]);

  // Inicializa multiComposicoes a partir dos artigos selecionados (filtrados)
  useEffect(() => {
    const numVar = parseInt(formData.variáveis) || 1;
    if (editingId && artigosPrecosFiltered.length > 0) {
      const existentes = artigosPrecosFiltered.map(p => {
        const artigoVinculado = artigos.find(a => a.codigo_unico === p.codigo_unico);
        return {
          indice: parseInt(artigoVinculado?.variavel_index) || 1,
          codigo_unico: p.codigo_unico,
          artigo_nome: p.artigo_nome,
          cor_nome: p.cor_nome,
          linha_nome: p.linha_nome,
          consumo_un: p.consumo_un || "",
          custo_kg: p.custo_kg || "",
          custo_un: p.custo_un || "",
        };
      });
      initMultiComposicoes(numVar, existentes);
    } else if (editingId) {
      initMultiComposicoes(numVar, []);
    }
  }, [editingId, modalOpen, artigosPrecosFiltered, formData.variáveis]);

  const { data: todasComposicoes = [] } = useQuery({
    queryKey: ["produto-rendimentos", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const { data } = await supabase
        .from('produto_rendimentos')
        .select('id, nome')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('nome');
      return data || [];
    },
    enabled: !!empresa_id,
    staleTime: 60000,
  });

  const composicoesQuery = useQuery({
    queryKey: ["produto-composicao", editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data, error } = await supabase
        .from('produto_composicao')
        .select('*')
        .eq('produto_id', editingId);
      console.log('[composicoesQuery] data:', data, 'error:', error);
      return data || [];
    },
    enabled: !!editingId && !!modalOpen,
    staleTime: 0,
  });

  const composicoesVinculadas = composicoesQuery.data;

  useEffect(() => {
    if (!editingId || !modalOpen) {
      setComposicoesPorVariavel({});
      return;
    }
    // Aguarda os dados estarem disponíveis (não apenas undefined inicial)
    if (!composicoesQuery.isSuccess) return;
    const lista = composicoesVinculadas || [];
    console.log('[Composicoes] editingId:', editingId, '| dados:', lista);
    const mapa = {};
    lista.forEach(c => {
      const idx = c.variavel_index ?? 1;
      if (!mapa[idx]) mapa[idx] = [];
      mapa[idx].push(String(c.rendimento_id));
    });
    console.log('[Composicoes] mapa gerado:', mapa);
    setComposicoesPorVariavel(mapa);
  }, [editingId, modalOpen, composicoesVinculadas, composicoesQuery.isSuccess])

  const filtered = useMemo(() => {
    let result = produtos;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.nome_produto?.toLowerCase().includes(t) ||
        p.descricao?.toLowerCase().includes(t) ||
        p.codigo_produto?.toLowerCase().includes(t)
      );
    }
    return result;
  }, [produtos, searchTerm]);




  // Mapeia artigos com detalhes de vínculo
  const artigosComDetalhes = useMemo(() => {
    return artigos.map(a => {
      const vinculo = vinculos.find(v => v.id === a.vinculo_id);
      return {
        ...a,
        artigo_nome: vinculo?.artigo_nome || a.artigo_nome || '-',
        cor_nome: vinculo?.cor_nome || a.cor_nome || '',
        linha_nome: vinculo?.linha_nome || '',
      };
    });
  }, [artigos, vinculos]);

  // IDs de vinculos já adicionados
  const artigosAdicionados = useMemo(() =>
    artigos.map(a => a.vinculo_id).filter(Boolean),
    [artigos]
  );

  const criarMutation = useMutation({
    mutationFn: (d) => createProduto(empresa_id, d, userEmail),
    onSuccess: () => {
      qc.invalidateQueries(["produto-comercial"]);
      closeModal();
      showSuccess({ title: "Produto criado", description: "Produto cadastrado com sucesso." });
    },
    onError: (e) => showError({ title: "Erro ao criar produto", description: e.message }),
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, d }) => updateProduto(id, d),
    onError: (e) => showError({ title: "Erro ao atualizar produto", description: e.message }),
  });

  const deletarMutation = useMutation({
    mutationFn: ({ id }) => deleteProduto(id),
    onSuccess: () => {
      qc.invalidateQueries(["produto-comercial"]);
      showSuccess({ title: "Produto excluído", description: "Produto removido com sucesso." });
    },
    onError: (e) => showError({ title: "Erro ao excluir produto", description: e.message }),
  });

  const addArtigoMutation = useMutation({
    mutationFn: (artigoData) => createArtigo(empresa_id, editingId, artigoData, userEmail),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produto-comercial-artigos", editingId] });
      setVinculoSearchPorVar({});
      setShowDropdownPorVar({});
      setItemsPendentes(true);
    },
    onError: (e) => showError({ title: "Erro ao vincular artigo", description: e.message }),
  });

  const removeArtigoMutation = useMutation({
    mutationFn: (id) => deleteArtigo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produto-comercial-artigos", editingId] }),
    onError: (e) => showError({ title: "Erro ao remover artigo", description: e.message }),
  });


  const saveComposicaoMutation = useMutation({
    mutationFn: async ({ produto_id, composicoes_por_variavel }) => {
      // Remove composições anteriores e insere as novas
      await supabase.from('produto_composicao').delete().eq('produto_id', produto_id);
      const rows = [];
      Object.entries(composicoes_por_variavel).forEach(([variavel, ids]) => {
        ids.forEach(rendimento_id => {
          rows.push({ produto_id, empresa_id, variavel_index: parseInt(variavel), rendimento_id });
        });
      });
      if (rows.length > 0) {
        const { error } = await supabase.from('produto_composicao').insert(rows);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produto-composicao"] });
    },
    onError: (e) => showError({ title: "Erro ao salvar composições", description: e.message }),
  });

  const closeModal = () => {
    setModalOpen(false);
    setFormData(EMPTY);
    setEditingId(null);
    setVinculoSearchPorVar({});
    setShowDropdownPorVar({});
    setComposicoesPorVariavel({});
    setComposicaoSearch("");
  };

  const toggleCategoria = (cat) => {
    setFormData(p => {
      const atual = Array.isArray(p.categorias_tamanho) ? p.categorias_tamanho : [];
      return {
        ...p,
        categorias_tamanho: atual.includes(cat) ? atual.filter(c => c !== cat) : [...atual, cat],
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.nome_produto) { showError({ title: "Campo obrigatório", description: "Nome do produto é obrigatório." }); return; }
    const numVar = parseInt(formData.variáveis) || 1;
    if (numVar < 1) { showError({ title: "Campo obrigatório", description: "Número de variáveis deve ser no mínimo 1." }); return; }
    const cats = Array.isArray(formData.categorias_tamanho) ? formData.categorias_tamanho : [];
    if (cats.length === 0) { showError({ title: "Campo obrigatório", description: "Selecione ao menos uma categoria de tamanho." }); return; }

    try {
      if (editingId) {
        // Remove campo local 'variáveis' (com acento) — não existe no banco; o campo real é num_variaveis
        const { variáveis: _v, ...dadosParaSalvar } = formData;
        await editarMutation.mutateAsync({ id: editingId, d: dadosParaSalvar });
        await saveComposicaoMutation.mutateAsync({ produto_id: editingId, composicoes_por_variavel: composicoesPorVariavel });

        // Salva consumo/custo de todos os artigos vinculados
        const produtoAtual = produtos.find(p => p.id === editingId);
        const artigosParaSalvar = multiComposicoes
          .filter(c => c.codigo_unico)
          .map(c => ({
            codigo_unico: c.codigo_unico,
            codigo_produto: produtoAtual?.codigo_produto || formData.codigo_produto || '',
            nome_produto: produtoAtual?.nome_produto || formData.nome_produto || '',
            consumo_un: parseFloat(String(c.consumo_un ?? '').replace(',', '.')) || 0,
            custo_kg: parseFloat(String(c.custo_kg ?? '').replace(',', '.')) || 0,
            indice: parseInt(c.indice) || 1,
          }));

        // Salva consumo e custo diretamente no Supabase
        if (artigosParaSalvar.length > 0) {
          for (const artigo of artigosParaSalvar) {
            const { data: existente } = await supabase
              .from('tabela_precos_sync')
              .select('id')
              .eq('codigo_unico', artigo.codigo_unico)
              .eq('produto_id', editingId)
              .eq('empresa_id', empresa_id)
              .maybeSingle();
            const consumoVal = parseFloat(String(artigo.consumo_un ?? '').replace(',', '.')) || 0;
            const custoVal = parseFloat(String(artigo.custo_kg ?? '').replace(',', '.')) || 0;
            const custoUn = consumoVal * custoVal;
            if (existente) {
              await supabase.from('tabela_precos_sync')
                .update({ consumo_un: consumoVal, custo_kg: custoVal, custo_un: custoUn, indice: artigo.indice || 1 })
                .eq('id', existente.id);
            } else {
              await supabase.from('tabela_precos_sync').insert({
                codigo_unico: artigo.codigo_unico,
                produto_id: editingId,
                empresa_id,
                codigo_produto: artigo.codigo_produto || '',
                nome_produto: artigo.nome_produto || '',
                consumo_un: consumoVal,
                custo_kg: custoVal,
                custo_un: custoUn,
                indice: artigo.indice || 1,
              });
            }
          }
        }

        // Valida e atualiza status_rendimento diretamente via Supabase
        try {
          const { data: artigosStatus } = await supabase
            .from('produto_comercial_artigo')
            .select('id, vinculo_id, status_rendimento')
            .eq('produto_id', editingId)
            .eq('empresa_id', empresa_id)
            .is('deleted_at', null);

          const { data: composicoesStatus } = await supabase
            .from('produto_composicao')
            .select('rendimento_id, variavel_index')
            .eq('produto_id', editingId)
            .eq('empresa_id', empresa_id);

          const { data: valoresStatus } = await supabase
            .from('produto_rendimento_valores')
            .select('rendimento_id, vinculo_id, rendimento_valor')
            .eq('produto_id', editingId)
            .eq('empresa_id', empresa_id)
            .is('deleted_at', null);

          for (const artigo of (artigosStatus || [])) {
            const rids = (composicoesStatus || []).map(c => c.rendimento_id);
            const temTodos = rids.length > 0 && rids.every(rid => {
              const val = (valoresStatus || []).find(v => v.rendimento_id === rid && v.vinculo_id === artigo.vinculo_id);
              return val && parseFloat(val.rendimento_valor) > 0;
            });
            await supabase.from('produto_comercial_artigo')
              .update({ status_rendimento: temTodos ? 'pronto' : 'pendente' })
              .eq('id', artigo.id);
          }
        } catch (err) {
          console.warn('Aviso ao validar status_rendimento:', err.message);
        }

        await qc.invalidateQueries({ queryKey: ["produto-comercial", empresa_id] });
        await qc.invalidateQueries({ queryKey: ["tabela-precos-sync-produto", editingId] });
        qc.refetchQueries({ queryKey: ["tabela-precos-sync-produto", editingId] });
        closeModal();
        showSuccess({ title: "Produto atualizado", description: "As informações do produto foram salvas com sucesso." });
      } else {
        const { variáveis: _v2, ...dadosCriar } = formData;
        criarMutation.mutate(dadosCriar);
      }
    } catch (err) {
      showError({ title: "Erro ao salvar", description: err?.message || "Erro desconhecido" });
    }
  }

  const toggleComposicaoVariavel = (variavel, rendimentoId) => {
    setComposicoesPorVariavel(prev => {
      const novo = { ...prev };
      const ids = novo[variavel] || [];
      const sid = String(rendimentoId);
      novo[variavel] = ids.includes(sid) ? ids.filter(x => x !== sid) : [...ids, sid];
      return novo;
    });
  };

  const handleEdit = (row) => {
    // Mapeia num_variaveis → variáveis para garantir que o loop gere as composições corretas
    setFormData({ ...row, variáveis: row.variáveis || row.num_variaveis || 1, categorias_tamanho: Array.isArray(row.categorias_tamanho) ? row.categorias_tamanho : [] });
    setEditingId(row.id);
    setComposicaoSearch("");
    setModalOpen(true);
  };

  const handleAddVinculo = (vinculo, variavelIndex) => {
    const artigosDestaVariavel = artigos.filter(a => parseInt(a.variavel_index ?? 1) === variavelIndex);
    const jaAdicionadoNessa = artigosDestaVariavel.map(a => a.vinculo_id).filter(Boolean).includes(vinculo.id);
    if (jaAdicionadoNessa) return;
    if (!editingId) return;
    addArtigoMutation.mutate({
      vinculo_id: vinculo.id,
        codigo_unico: vinculo.codigo_unico,
        artigo_codigo: vinculo.artigo_codigo || null,
        artigo_nome: vinculo.artigo_nome || "",
        cor_nome: vinculo.cor_nome || "",
        linha_nome: vinculo.linha_nome || "",
      variavel_index: variavelIndex,
    });
  };

  return (
    <TooltipProvider>
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Produto</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie produtos comerciais e seus artigos vinculados</p>
      </div>

      <Tabs defaultValue="produto" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="produto">Produto</TabsTrigger>
          <TabsTrigger value="composicao">Composição do produto</TabsTrigger>
          <TabsTrigger value="rendimentos">Rendimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="produto" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Input
                className="pl-9"
                placeholder="Buscar por nome, código ou descrição..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            <Button onClick={() => { setFormData(EMPTY); setEditingId(null); setComposicoesPorVariavel({}); setModalOpen(true); }} className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" /> Novo Produto
            </Button>
          </div>

          <ErpTableContainer>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Produto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Descrição</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Data Cadastro</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum produto cadastrado ainda.</td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleEdit(p)}>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">{p.codigo_produto || "—"}</td>
                    <td className="px-4 py-3 font-medium">{p.nome_produto}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.descricao || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={cn("px-2 py-1 rounded text-xs font-medium w-fit",
                          p.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {p.status}
                        </span>
                        {produtosComPendencia.has(p.id) && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 w-fit">
                            Pendente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {p.created_date ? new Date(p.created_date).toLocaleDateString('pt-BR') : "-"}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Editar" className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Excluir" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => showDelete({ title: "Excluir Produto", description: `Excluir "${p.nome_produto}"? Esta ação não pode ser desfeita.`, onConfirm: () => deletarMutation.mutateAsync({ id: p.id, codigo: p.codigo, empresa: empresa_id }) })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ErpTableContainer>
        </TabsContent>

        <TabsContent value="composicao" className="space-y-4">
          <ComposicaoPecaTab />
        </TabsContent>

        <TabsContent value="rendimentos" className="space-y-4">
          <RendimentosTabSimplificado itemsPendentes={itemsPendentes} onSyncComplete={() => setItemsPendentes(false)} />
        </TabsContent>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Código */}
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">Código</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono text-blue-700 font-semibold">
                {editingId ? (formData.codigo_produto || "—") : "Gerado automaticamente"}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Nome do Produto *</label>
              <Input value={formData.nome_produto || ""} onChange={e => setFormData(p => ({ ...p, nome_produto: e.target.value }))} placeholder="Ex: Camiseta Manga Curta Esportiva" />
            </div>

            {/* Categorias de Tamanho */}
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">
                Categorias de Tamanho *
                <span className="ml-1 text-xs font-normal text-slate-400">(selecione ao menos uma)</span>
              </label>
              <div className="flex gap-3">
                {CATEGORIAS_TAMANHO.map(cat => {
                  const sel = (Array.isArray(formData.categorias_tamanho) ? formData.categorias_tamanho : []).includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoria(cat)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-all select-none",
                        sel
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:bg-blue-50"
                      )}
                    >
                      {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,80px) 1fr' }}>
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Variáveis</label>
                <Input type="number" min="1" max="4" value={formData.variáveis || 1} onChange={e => { const v = Math.max(1, Math.min(4, parseInt(e.target.value) || 1)); setFormData(p => ({ ...p, variáveis: v })); }} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Descrição</label>
                <Input value={formData.descricao || ""} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição complementar" />
              </div>
            </div>
            {editingId && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Status</label>
                <Select value={formData.status || "Ativo"} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Composições do produto por variável */}
            {editingId && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">Composições do produto</label>
                <div className="space-y-4">
                  {Array.from({ length: parseInt(formData.variáveis) || 1 }, (_, i) => i + 1).map(variavel => {
                    const selecionadas = composicoesPorVariavel[variavel] || [];
                    const vsearch = vinculoSearchPorVar[variavel] || "";
                    const showDrop = showDropdownPorVar[variavel] || false;
                    const artigosVariavel = artigos.filter(a => {
                      const vi = a.variavel_index !== null && a.variavel_index !== undefined ? parseInt(a.variavel_index) : 1;
                      return vi === variavel;
                    });
                    const artigosAdicionadosNaVariavel = artigosVariavel.map(a => a.vinculo_id).filter(Boolean);
                    const vinculosFiltradosVar = !vsearch.trim()
                      ? vinculos.slice(0, 30)
                      : vinculos.filter(v =>
                          v.codigo_unico?.toLowerCase().includes(vsearch.toLowerCase()) ||
                          v.artigo_nome?.toLowerCase().includes(vsearch.toLowerCase()) ||
                          v.cor_nome?.toLowerCase().includes(vsearch.toLowerCase())
                        ).slice(0, 30);
                    return (
                      <div key={variavel} className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/40">
                        <label className="text-xs font-semibold text-slate-700 block">Composição {variavel}</label>
                        {/* Seletor de composições */}
                        <div className="border border-slate-200 rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto bg-white">
                          {todasComposicoes.map(c => {
                            const sel = selecionadas.includes(String(c.id));
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => toggleComposicaoVariavel(variavel, c.id)}
                                style={sel
                                  ? { background: '#EFF6FF', border: '1px solid #93C5FD', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', width: '100%', textAlign: 'left' }
                                  : { background: '#fff', border: '1px solid transparent', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', width: '100%', textAlign: 'left' }
                                }
                              >
                                <div
                                  style={sel
                                    ? { background: '#2563EB', border: '2px solid #2563EB', width: 16, height: 16, minWidth: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                                    : { background: '#fff', border: '2px solid #CBD5E1', width: 16, height: 16, minWidth: 16, borderRadius: 3 }
                                  }
                                >
                                  {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span style={sel ? { fontWeight: 600, color: '#1D4ED8', fontSize: 14 } : { color: '#374151', fontSize: 14 }}>{c.nome}</span>
                                {sel && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#2563EB', fontWeight: 500 }}>✓</span>}
                              </button>
                            );
                          })}
                          {todasComposicoes.length === 0 && (
                            <p className="text-xs text-slate-400 px-2 py-1">Nenhuma composição cadastrada.</p>
                          )}
                        </div>
                        {selecionadas.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {selecionadas.map(id => {
                              const comp = todasComposicoes.find(c => String(c.id) === id);
                              return comp ? (
                                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {comp.nome}
                                  <button type="button" onClick={() => toggleComposicaoVariavel(variavel, comp.id)} className="ml-0.5 text-blue-400 hover:text-blue-700">×</button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Artigos vinculados a esta composição */}
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Artigos desta composição</p>
                          <div className="relative mb-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <Input
                                className="pl-8 text-xs h-8"
                                placeholder="Buscar artigo para adicionar..."
                                value={vsearch}
                                onChange={e => { setVinculoSearchPorVar(p => ({ ...p, [variavel]: e.target.value })); setShowDropdownPorVar(p => ({ ...p, [variavel]: true })); }}
                                onFocus={() => setShowDropdownPorVar(p => ({ ...p, [variavel]: true }))}
                              />
                            </div>
                            {showDrop && vinculosFiltradosVar.length > 0 && (
                              <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                {vinculosFiltradosVar.map(v => {
                                  const jaAdicionado = artigosAdicionadosNaVariavel.includes(v.id);
                                  return (
                                    <button
                                       key={v.id}
                                       type="button"
                                       onClick={() => { if (!jaAdicionado) { handleAddVinculo(v, variavel); setShowDropdownPorVar(p => ({ ...p, [variavel]: false })); } }}
                                       disabled={jaAdicionado || addArtigoMutation.isPending}
                                       className={cn("w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0 flex flex-wrap items-center gap-1", jaAdicionado ? "opacity-40 cursor-not-allowed" : "cursor-pointer")}
                                     >
                                       <span className="font-mono font-bold text-blue-700">{v.codigo_unico}</span>
                                       <span className="text-slate-700">{v.artigo_nome || '-'}</span>
                                       {v.cor_nome && <span className="text-slate-400">| {v.cor_nome}</span>}
                                       {v.linha_nome && <span className="text-slate-400">| {v.linha_nome}</span>}
                                       {jaAdicionado && <span className="ml-auto text-green-600">✓</span>}
                                     </button>
                                  );
                                })}
                              </div>
                            )}
                            {showDrop && (
                              <button onClick={() => setShowDropdownPorVar(p => ({ ...p, [variavel]: false }))} className="text-xs text-slate-400 mt-1 hover:text-slate-600 block">fechar lista</button>
                            )}
                          </div>

                          {/* Artigos como checkboxes */}
                          <div className="border border-slate-200 rounded-lg p-2 space-y-1 min-h-[40px] bg-white">
                            {artigosVariavel.length === 0 && (
                              <p className="text-xs text-slate-400 px-2 py-1">Nenhum artigo vinculado. Use a busca acima.</p>
                            )}
                            {artigosComDetalhes.filter(a => {
                              const vi = a.variavel_index !== null && a.variavel_index !== undefined ? parseInt(a.variavel_index) : 1;
                              return vi === variavel;
                            }).map(a => (
                              <button
                                type="button"
                                key={a.id}
                                onClick={() => removeArtigoMutation.mutate(a.id)}
                                style={{ background: '#EFF6FF', border: '1px solid #93C5FD', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', width: '100%', textAlign: 'left', flexWrap: 'wrap' }}
                                title="Clique para remover"
                              >
                                <div style={{ background: '#2563EB', border: '2px solid #2563EB', width: 16, height: 16, minWidth: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span style={{ fontWeight: 600, color: '#1D4ED8', fontSize: 13 }}>{a.codigo_unico}</span>
                                <span style={{ color: '#1D4ED8', fontSize: 13 }}>{a.artigo_nome}</span>
                                {a.cor_nome && <span style={{ color: '#64748B', fontSize: 12 }}>| {a.cor_nome}</span>}
                                {a.linha_nome && <span style={{ color: '#64748B', fontSize: 12 }}>| {a.linha_nome}</span>}
                                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#93C5FD', fontWeight: 500 }}>remover ×</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {todasComposicoes.length === 0 && (
                  <p className="text-xs text-slate-400 px-2 py-1 mt-2">Nenhuma composição cadastrada. Acesse a aba "Composição do produto".</p>
                )}
              </div>
            )}

            {/* Custo e Consumo - apenas dos artigos selecionados */}
            {editingId && artigosPrecosFiltered.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">Custo e Consumo</label>
                <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/40">
                  {artigosPrecosFiltered.map((a) => (
                    <div key={a.codigo_unico} className="grid gap-3 p-2 bg-white rounded border border-slate-200" style={{ gridTemplateColumns: '1fr 90px 90px 90px' }}>
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block">{a.codigo_unico} • {a.artigo_nome}</span>
                        <span className="text-xs text-slate-500">{[a.cor_nome, a.linha_nome].filter(Boolean).join(' • ') || '—'}</span>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Consumo (un)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(multiComposicoes.find(c => c.codigo_unico === a.codigo_unico)?.consumo_un) || a.consumo_un || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const cmp = multiComposicoes.find(c => c.codigo_unico === a.codigo_unico);
                            if (cmp) cmp.consumo_un = val;
                            setMultiComposicoes([...multiComposicoes]);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Custo (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(multiComposicoes.find(c => c.codigo_unico === a.codigo_unico)?.custo_kg) || a.custo_kg || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const cmp = multiComposicoes.find(c => c.codigo_unico === a.codigo_unico);
                            if (cmp) cmp.custo_kg = val;
                            setMultiComposicoes([...multiComposicoes]);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Custo (un)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={a.custo_un || ''}
                          readOnly
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-100"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-composição: blocos de artigo + consumo + custo por variável */}


            {!editingId && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded px-3 py-2">
                💡 Após salvar o produto, você poderá vincular artigos.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="ghost" onClick={closeModal}>
              {editingId ? "Fechar" : "Cancelar"}
            </Button>
            {!editingId && (
              <Button onClick={handleSubmit} disabled={criarMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {criarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar
              </Button>
            )}
            {editingId && (
              <Button onClick={handleSubmit} disabled={editarMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {editarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Atualizar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}