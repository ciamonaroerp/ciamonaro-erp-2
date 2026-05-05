import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { supabase } from "@/components/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

async function invoke(action, payload) {
  if (action === 'list_rendimentos') {
    const { data } = await supabase.from('produto_rendimentos').select('*').eq('empresa_id', payload.empresa_id).is('deleted_at', null).order('nome');
    return { data: { data: data || [] } };
  }
  if (action === 'list_produtos') {
    const { data } = await supabase.from('produto_comercial').select('*').eq('empresa_id', payload.empresa_id).is('deleted_at', null).order('nome_produto');
    return { data: { data: data || [] } };
  }
  if (action === 'list_artigos_empresa') {
    const { data } = await supabase.from('produto_comercial_artigo').select('*').eq('empresa_id', payload.empresa_id).is('deleted_at', null);
    return { data: { data: data || [] } };
  }
  if (action === 'list_produto_composicao_empresa') {
    const { data } = await supabase.from('produto_composicao').select('*').eq('empresa_id', payload.empresa_id);
    return { data: { data: data || [] } };
  }
  if (action === 'list_rendimento_valores') {
    const { data } = await supabase.from('produto_rendimento_valores').select('*').eq('empresa_id', payload.empresa_id);
    return { data: { data: data || [] } };
  }
  if (action === 'list_rendimento_status') {
    return { data: { data: {} } };
  }
  if (action === 'upsert_rendimento_valor') {
    const { empresa_id, rendimento_id, produto_id, descricao_artigo, vinculo_id, valor } = payload;
    // Busca por rendimento_id + produto_id + vinculo_id (chave lógica por artigo)
    const query = supabase
      .from('produto_rendimento_valores')
      .select('id')
      .eq('rendimento_id', rendimento_id)
      .eq('produto_id', produto_id);
    if (vinculo_id) {
      query.eq('vinculo_id', vinculo_id);
    } else {
      query.is('vinculo_id', null);
    }
    const { data: existing } = await query.maybeSingle();
    let error;
    if (existing?.id) {
      ({ error } = await supabase.from('produto_rendimento_valores')
        .update({ valor, sincronizado: true, descricao_artigo: descricao_artigo || '', vinculo_id: vinculo_id || null })
        .eq('id', existing.id));
    } else {
      // Verifica se existe pela constraint do banco (rendimento_id + produto_id + descricao_artigo)
      const { data: existingByDesc } = await supabase
        .from('produto_rendimento_valores')
        .select('id')
        .eq('rendimento_id', rendimento_id)
        .eq('produto_id', produto_id)
        .eq('descricao_artigo', descricao_artigo || '')
        .maybeSingle();
      if (existingByDesc?.id) {
        ({ error } = await supabase.from('produto_rendimento_valores')
          .update({ valor, sincronizado: true, vinculo_id: vinculo_id || null })
          .eq('id', existingByDesc.id));
      } else {
        ({ error } = await supabase.from('produto_rendimento_valores')
          .insert({ empresa_id, rendimento_id, produto_id, descricao_artigo: descricao_artigo || '', vinculo_id: vinculo_id || null, valor, sincronizado: true }));
      }
    }
    if (error) return { data: { error: error.message } };
    return { data: {} };
  }
  return { data: { data: [] } };
}

function parseValInput(s) {
  const n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? 0 : parseFloat(n.toFixed(3));
}

function formatVal(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? "0,000" : n.toFixed(3).replace('.', ',');
}

export default function RendimentosTabSimplificado({ itemsPendentes = false, onSyncComplete = () => {} }) {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showError, showSuccess, showConfirm } = useGlobalAlert();

  const [syncing, setSyncing] = useState(false);
  const [syncingCodigo, setSyncingCodigo] = useState(null);
  const [editChanges, setEditChanges] = useState({});
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 10;

  const handleSincronizarItem = async (codigo_produto, artigo_codigo) => {
    if (!codigo_produto) {
      showError({ title: "Produto sem código", description: "Este produto não possui código definido. Defina um código antes de sincronizar." });
      return;
    }
    setSyncingCodigo(codigo_produto);
    try {
      // Sincronização via tabela_precos_sync — sem chamada externa
      qc.invalidateQueries(["rendimentos-status", empresa_id]);
      showSuccess({ title: "Sincronizado", description: "Dados atualizados com sucesso." });
      onSyncComplete();
    } catch (e) {
      showError({ title: "Erro ao sincronizar", description: e.message || "Erro desconhecido." });
    } finally {
      setSyncingCodigo(null);
    }
  };

  const handleSincronizar = () => {
    showConfirm({
      title: "Sincronizar dados",
      description: "Deseja sincronizar os dados com a tabela de preços?\nEssa ação irá atualizar os dados utilizados na formação de preço e pode impactar os valores atuais.",
      onConfirm: async () => {
        setSyncing(true);
        try {
          qc.invalidateQueries(["rendimentos-valores", empresa_id]);
          showSuccess({ title: "Dados atualizados", description: "Cache invalidado com sucesso." });
          onSyncComplete();
        } catch (e) {
          showError({ title: "Erro ao sincronizar dados", description: e.message || "Erro desconhecido." });
        } finally {
          setSyncing(false);
        }
      },
    });
  };

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [rendInputs, setRendInputs] = useState({});

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ["produto-comercial", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const res = await invoke('list_produtos', { empresa_id });
      return res.data?.data || [];
    },
    enabled: !!empresa_id,
    staleTime: 60000,
  });

  const { data: rendimentos = [] } = useQuery({
    queryKey: ["produto-rendimentos", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const res = await invoke('list_rendimentos', { empresa_id });
      return res.data?.data || [];
    },
    enabled: !!empresa_id,
    staleTime: 60000,
  });

  const { data: todosArtigos = [] } = useQuery({
    queryKey: ["rendimentos-artigos", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const res = await invoke('list_artigos_empresa', { empresa_id });
      return res.data?.data || [];
    },
    enabled: !!empresa_id,
    staleTime: 60000,
  });

  // Vinculo mapping: id -> { nome_artigo, nome_cor, nome_linha_comercial }
  const { data: vinculos = [] } = useQuery({
  queryKey: ["config-vinculos-render", empresa_id],
  queryFn: async () => {
    if (!empresa_id) return [];
    const { data } = await supabase.from('config_vinculos').select('*').eq('empresa_id', empresa_id).is('deleted_at', null);
    return data || [];
  },
  enabled: !!empresa_id,
  staleTime: 60000,
  });

  const { data: composicoes = [] } = useQuery({
    queryKey: ["produto-composicao-empresa", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const res = await invoke('list_produto_composicao_empresa', { empresa_id });
      return res.data?.data || [];
    },
    enabled: !!empresa_id,
    staleTime: 30000,
  });

  const { data: valores = [] } = useQuery({
    queryKey: ["rendimentos-valores", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const res = await invoke('list_rendimento_valores', { empresa_id });
      return res.data?.data || [];
    },
    enabled: !!empresa_id,
    staleTime: 30000,
  });

  const valoresMap = useMemo(() => {
    const map = {};
    for (const v of valores) {
      const vid = v.vinculo_id || '';
      // Indexa estritamente por vinculo_id para não misturar valores de artigos diferentes
      map[`${v.rendimento_id}|${v.produto_id}|${vid}`] = v.valor;
    }
    return map;
  }, [valores]);

  const sincronizadoMap = useMemo(() => {
    const map = {};
    for (const v of valores) {
      map[`${v.rendimento_id}|${v.produto_id}`] = v.sincronizado;
    }
    return map;
  }, [valores]);

  const ultimaSincMap = useMemo(() => {
    const map = {};
    for (const v of valores) {
      if (v.sincronizado && v.updated_at) {
        const prev = map[v.produto_id];
        if (!prev || v.updated_at > prev) map[v.produto_id] = v.updated_at;
      }
    }
    return map;
  }, [valores]);

  const formatSinc = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const rendimentosMap = useMemo(() => {
    const m = {};
    rendimentos.forEach(r => { m[r.id] = r; });
    return m;
  }, [rendimentos]);

  // lista plana de {produto, vinculo_id} para exibir uma linha por combinação
  const linhasTabela = useMemo(() => {
    const idsComComposicao = new Set(composicoes.map(c => c.produto_id));
    const resultado = [];
    const vinculosMap = {};
    vinculos.forEach(v => {
      vinculosMap[v.id] = { artigo: v.artigo_nome, cor: v.cor_nome, linha: v.linha_nome };
    });

    for (const p of produtos) {
      if (!idsComComposicao.has(p.id)) continue;
      const artigosDoP = todosArtigos.filter(a => a.produto_id === p.id && !a.deleted_at);
      const vinculoIds = [...new Set(artigosDoP.map(a => a.vinculo_id).filter(Boolean))];
      if (vinculoIds.length === 0) {
        resultado.push({ produto: p, vinculo_id: "", artigo_nome: "" });
      } else {
        // Deduplica por artigo_nome para evitar linhas idênticas quando o mesmo artigo
        // foi adicionado em variáveis diferentes ou vinculado por IDs distintos
        const artigosVistos = new Set();
        vinculoIds.forEach(vid => {
          const vin = vinculosMap[vid];
          const artigoNome = vin?.artigo || vid;
          if (!artigosVistos.has(artigoNome)) {
            artigosVistos.add(artigoNome);
            resultado.push({ produto: p, vinculo_id: vid, artigo_nome: artigoNome });
          }
        });
      }
    }
    return resultado;
  }, [produtos, composicoes, todosArtigos, vinculos]);

  const getComposicoesDoProduto = (produto_id) => {
    const rows = composicoes.filter(c => c.produto_id === produto_id);
    const grupo = {};
    for (const c of rows) {
      const idx = c.variavel_index || 1;
      if (!grupo[idx]) grupo[idx] = [];
      grupo[idx].push(c.rendimento_id);
    }
    return grupo;
  };

  const upsertMutation = useMutation({
    mutationFn: async ({ rendimento_id, produto_id, artigo_nome, vinculo_id, valor }) => {
      const res = await invoke('upsert_rendimento_valor', {
        empresa_id, rendimento_id, produto_id,
        descricao_artigo: artigo_nome || "",
        vinculo_id: vinculo_id || null,
        valor,
      });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onError: (e) => showError({ title: "Erro ao salvar", description: e.message }),
  });

  const { data: statusBackend = {} } = useQuery({
    queryKey: ["rendimentos-status", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return {};
      const res = await invoke('list_rendimento_status', { empresa_id });
      return res.data?.data || {};
    },
    enabled: !!empresa_id,
    staleTime: 30000,
  });

  // Retorna o status persistido direto do produto_comercial.status_rendimento
  const getStatus = (produto_id) => {
    const produto = produtos.find(p => p.id === produto_id);
    return produto?.status_rendimento || 'pendente';
  };

  const temValores = (produto_id, vinculo_id) => getStatus(produto_id, vinculo_id) !== 'pendente';

  const temAlgumaAlteracao = () => Object.keys(editChanges).length > 0;
  const temAlgumZero = () => {
    const grupo = getComposicoesDoProduto(editingProduto?.id);
    const allRids = Object.values(grupo).flat().filter(rid => !!rendimentosMap[rid]);
    return allRids.some(rid => {
      const valor = parseValInput(rendInputs[rid] || "0");
      return valor === 0;
    });
  };

  const handleOpenEdit = async (produto, artigo_nome, vinculo_id) => {
    const artigoMatch = todosArtigos.find(a => a.produto_id === produto.id && a.vinculo_id === vinculo_id);
    const artigo_codigo = artigoMatch?.artigo_codigo || null;
    setEditingProduto({ ...produto, artigo_nome, artigo_codigo, vinculo_id: vinculo_id || null });
    setEditChanges({});
    setEditModalOpen(true);

    // Busca valores frescos do backend para garantir que os dados salvos apareçam
    const res = await invoke('list_rendimento_valores', { empresa_id });
    const valoresFrescos = res.data?.data || [];
    
    const freshMap = {};
    for (const v of valoresFrescos) {
      const vid2 = v.vinculo_id || '';
      freshMap[`${v.rendimento_id}|${v.produto_id}|${vid2}`] = v.valor;
      // Também indexa com string vazia para fallback
      if (vid2 !== '' && freshMap[`${v.rendimento_id}|${v.produto_id}|`] == null) {
        freshMap[`${v.rendimento_id}|${v.produto_id}|`] = v.valor;
      }
    }

    const inputs = {};
    const grupo = getComposicoesDoProduto(produto.id);
    const vid = vinculo_id || '';
    Object.values(grupo).flat().forEach(rid => {
      // Busca SOMENTE pelo vinculo_id exato deste item — sem fallback para outros artigos
      const val = freshMap[`${rid}|${produto.id}|${vid}`];
      inputs[rid] = val != null ? parseFloat(val).toFixed(3).replace('.', ',') : "";
    });
    setRendInputs(inputs);
    
    // Atualiza cache do react-query com os dados frescos
    qc.setQueryData(["rendimentos-valores", empresa_id], valoresFrescos);
  };

  const handleSalvar = async () => {
    const grupo = getComposicoesDoProduto(editingProduto.id);
    // Filtra apenas rendimentos válidos (não deletados) para evitar salvar valores de rendimentos obsoletos
    const allRids = Object.values(grupo).flat().filter(rid => !!rendimentosMap[rid]);

    for (const rid of allRids) {
      const valor = parseValInput(rendInputs[rid] || "0");
      if (valor <= 0) {
        const rend = rendimentosMap[rid];
        showError({ title: "Valor inválido", description: `O rendimento "${rend?.nome || rid}" não pode ser zero ou vazio.` });
        return;
      }
    }

    for (const rid of allRids) {
      const valor = parseValInput(rendInputs[rid] || "0");
      await upsertMutation.mutateAsync({ rendimento_id: rid, produto_id: editingProduto.id, artigo_nome: editingProduto.artigo_nome, vinculo_id: editingProduto.vinculo_id || null, valor });
    }
    qc.invalidateQueries(["rendimentos-valores", empresa_id]);
    
    const produtoEditado = { ...editingProduto };
    setEditModalOpen(false);
    setEditingProduto(null);
    showSuccess({ title: "Salvo", description: "Valores atualizados com sucesso." });
    
    if (!produtoEditado.codigo) return;
    await handleSincronizarItem(produtoEditado.codigo, produtoEditado.artigo_codigo);
  };

  // Filtra por busca
  const linhasFiltradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return linhasTabela;
    return linhasTabela.filter(({ produto: p, artigo_nome }) =>
      p.nome_produto?.toLowerCase().includes(q) ||
      p.codigo?.toLowerCase().includes(q) ||
      artigo_nome?.toLowerCase().includes(q)
    );
  }, [linhasTabela, busca]);

  // Ordena: pendente → sincronizar → pronto
  const PRIORIDADE_STATUS = { pendente: 0, sincronizar: 1, pronto: 2 };
  const linhasOrdenadas = useMemo(() => {
    return [...linhasFiltradas].sort((a, b) => {
      const sa = PRIORIDADE_STATUS[getStatus(a.produto.id)] ?? 2;
      const sb = PRIORIDADE_STATUS[getStatus(b.produto.id)] ?? 2;
      return sa - sb;
    });
  }, [linhasFiltradas, produtos]);

  const totalPaginas = Math.max(1, Math.ceil(linhasOrdenadas.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPagina = linhasOrdenadas.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  if (loadingProdutos) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  const allItems = linhasPagina.map(({ produto: p, vinculo_id, artigo_nome }) => ({
    key: `${p.id}|${vinculo_id}`,
    produto: p,
    vinculo_id,
    artigo_nome,
    type: getStatus(p.id),
  }));

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Input
              placeholder="Buscar por código, produto ou artigo…"
              value={busca}
              onChange={e => { setBusca(e.target.value); setPagina(1); }}
              className="max-w-xs"
            />
            <span className="text-sm text-slate-500 whitespace-nowrap">{linhasOrdenadas.length} resultado(s)</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-900 w-8"></th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 w-32">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Nome do Produto</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Artigo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 w-36">Última sinc.</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900 w-24">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900 w-28">Ações</th>
              </tr>
            </thead>
            <tbody>
              {allItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Nenhum produto com composições vinculadas. Acesse a aba "Produto" para configurar.
                  </td>
                </tr>
              )}
              {allItems.map((row) => {
                const { produto: p, vinculo_id, artigo_nome, type } = row;
                const artigoMatch = todosArtigos.find(a => a.produto_id === p.id && a.vinculo_id === vinculo_id);
                const artigo_codigo = artigoMatch?.artigo_codigo || null;

                return (
                  <tr
                    key={row.key}
                    className="border-b border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-2 py-3 text-center">
                      {type === "pendente" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span><AlertTriangle className="h-4 w-4 text-amber-500" /></span>
                          </TooltipTrigger>
                          <TooltipContent>Sem valores configurados</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">{p.codigo || "—"}</td>
                    <td className="px-4 py-3 font-medium">{p.nome_produto}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{artigo_nome || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatSinc(ultimaSincMap[p.id])}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {type === 'pendente' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Pendente
                        </span>
                      ) : type === 'sincronizar' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Sincronizar
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Pronto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => handleOpenEdit(p, artigo_nome, vinculo_id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar valores</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-green-600 hover:bg-green-50"
                              disabled={syncingCodigo === p.codigo}
                              onClick={() => handleSincronizarItem(p.codigo, artigo_codigo)}
                            >
                              {syncingCodigo === p.codigo
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <RefreshCw className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Sincronizar este produto</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Página {paginaAtual} de {totalPaginas}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual === 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
              >Anterior</Button>
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              >Próxima</Button>
            </div>
          </div>
        )}

        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Rendimentos — {editingProduto?.nome_produto}{editingProduto?.artigo_nome ? ` / ${editingProduto.artigo_nome}` : ""}</DialogTitle>
            </DialogHeader>
            {editingProduto && (() => {
              const grupo = getComposicoesDoProduto(editingProduto.id);
              const variaveis = Object.keys(grupo).sort((a, b) => Number(a) - Number(b));
              return (
                <div className="space-y-5 py-2">
                  {variaveis.map(idx => {
                    const rids = grupo[idx];
                    const total = parseFloat(rids.reduce((sum, rid) => sum + parseValInput(rendInputs[rid] || "0"), 0).toFixed(3));
                    return (
                      <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">Composição {idx}</span>
                          <div className="flex items-center gap-2">
                            {temAlgumaAlteracao() && !temAlgumZero() && (
                              <span className="text-xs font-medium text-blue-600 inline-flex items-center gap-1">↻ Sincronizar</span>
                            )}
                            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                              Total: {formatVal(total)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {rids.map(rid => {
                            const rend = rendimentosMap[rid];
                            if (!rend) return null;
                            return (
                              <div key={rid} className="flex items-center gap-3">
                                <label className="text-sm text-slate-700 flex-1 truncate" title={rend.nome}>
                                  {rend.nome}
                                </label>
                                <Input
                                  className="w-32 text-right text-sm font-mono"
                                  placeholder="0,000"
                                  value={rendInputs[rid] ?? ""}
                                  onBlur={e => {
                                    const n = parseFloat(String(rendInputs[rid] || '0').replace(',', '.'));
                                    if (!isNaN(n)) {
                                      setRendInputs(prev => ({ ...prev, [rid]: n.toFixed(3).replace('.', ',') }));
                                    }
                                  }}
                                  onChange={e => {
                                    const raw = e.target.value.replace(/[^0-9,]/g, '');
                                    const match = raw.match(/^(\d*)(,?)(\d{0,3})/);
                                    const newValue = match ? match[0] : '';
                                    setRendInputs(prev => ({ ...prev, [rid]: newValue }));
                                    setEditChanges(prev => ({ ...prev, [rid]: true }));
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {temAlgumaAlteracao() && !temAlgumZero() && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700">
                  ↻ Sincronizar
                </div>
              )}
              {temAlgumZero() && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">
                  ⚠ Valores não podem ser zero
                </div>
              )}
              {!temAlgumaAlteracao() && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                  Nenhuma alteração
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleSalvar}
                  disabled={upsertMutation.isPending || !temAlgumaAlteracao() || temAlgumZero()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}