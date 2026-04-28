import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { supabase } from "@/components/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { cn } from "@/lib/utils";

// Helper: chama a função backend produtoComercialCRUD diretamente via supabase RPC ou tabelas
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
    const { data } = await supabase.from('produto_composicao').select('*').eq('empresa_id', payload.empresa_id).is('deleted_at', null);
    return { data: { data: data || [] } };
  }
  if (action === 'list_rendimento_valores') {
    const { data } = await supabase.from('produto_rendimento_valores').select('*').eq('empresa_id', payload.empresa_id);
    return { data: { data: data || [] } };
  }
  if (action === 'upsert_rendimento_valor') {
    const { empresa_id, rendimento_id, produto_id, descricao_artigo, vinculo_id, valor } = payload;
    const { error } = await supabase.from('produto_rendimento_valores').upsert({ empresa_id, rendimento_id, produto_id, descricao_artigo: descricao_artigo || '', vinculo_id: vinculo_id || null, valor }, { onConflict: 'rendimento_id,produto_id,descricao_artigo' });
    if (error) return { data: { error: error.message } };
    return { data: {} };
  }
  if (action === 'delete_rendimento_valores_linha') {
    const { empresa_id, produto_id, descricao_artigo } = payload;
    await supabase.from('produto_rendimento_valores').delete().eq('empresa_id', empresa_id).eq('produto_id', produto_id).eq('descricao_artigo', descricao_artigo);
    return { data: {} };
  }
  return { data: { data: [] } };
}

function parseArtigo(raw) {
  try { return JSON.parse(raw); } catch { return {}; }
}

function formatVal(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? "" : n.toFixed(3).replace('.', ',');
}

function ActionButtons({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar"
            className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Editar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir"
            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Excluir</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function RendimentosTab() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showDelete, showError, showSuccess } = useGlobalAlert();



  // Modal editar linha (produto x artigo)
  const [editLinhaOpen, setEditLinhaOpen] = useState(false);
  const [editingLinha, setEditingLinha] = useState(null);
  const [linhaValores, setLinhaValores] = useState({});

  // -- Queries --
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

  const { data: todosArtigos = [], isLoading: loadingArtigos } = useQuery({
    queryKey: ["rendimentos-artigos", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const res = await invoke('list_artigos_empresa', { empresa_id });
      return res.data?.data || [];
    },
    enabled: !!empresa_id,
    staleTime: 60000,
  });

  const { data: rendimentos = [], isLoading: loadingRendimentos } = useQuery({
    queryKey: ["rendimentos", empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const res = await invoke('list_rendimentos', { empresa_id });
      return res.data?.data || [];
    },
    enabled: !!empresa_id,
    staleTime: 30000,
  });

  const { data: todasComposicoes = [] } = useQuery({
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

  // -- Linhas da tabela --
  const linhas = useMemo(() => {
    const result = [];
    const seen = new Set();
    for (const produto of produtos) {
      const artigosDoProduto = todosArtigos.filter(a => a.produto_id === produto.id);
      if (artigosDoProduto.length === 0) {
        const key = `${produto.id}|`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ produto, descricao_artigo: "—", codigo_artigo: "—" });
        }
      } else {
        const groupedByDescricao = {};
        for (const a of artigosDoProduto) {
          const parsed = parseArtigo(a.artigo);
          const desc = parsed.artigo_nome || "—";
          if (!groupedByDescricao[desc]) {
            groupedByDescricao[desc] = { codigo: parsed.codigo_unico || "—", desc };
          }
        }
        for (const [desc, info] of Object.entries(groupedByDescricao)) {
          const key = `${produto.id}|${desc}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ produto, descricao_artigo: desc, codigo_artigo: info.codigo });
          }
        }
      }
    }
    return result;
  }, [produtos, todosArtigos]);

  const valoresMap = useMemo(() => {
    const map = {};
    for (const v of valores) {
      map[`${v.rendimento_id}|${v.produto_id}|${v.descricao_artigo}`] = v;
    }
    return map;
  }, [valores]);

  // -- Mutations --

  const upsertValorMutation = useMutation({
    mutationFn: async ({ rendimento_id, produto_id, descricao_artigo, valor }) => {
      const res = await invoke('upsert_rendimento_valor', {
        empresa_id, rendimento_id, produto_id, descricao_artigo, valor,
      });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => qc.invalidateQueries(["rendimentos-valores", empresa_id]),
    onError: (e) => showError({ title: "Erro ao salvar", description: e.message }),
  });

  const deletarLinhaMutation = useMutation({
    mutationFn: ({ produto_id, descricao_artigo }) =>
      invoke('delete_rendimento_valores_linha', { empresa_id, produto_id, descricao_artigo }),
    onSuccess: () => {
      qc.invalidateQueries(["rendimentos-valores", empresa_id]);
      showSuccess({ title: "Linha excluída", description: "Valores da linha removidos com sucesso." });
    },
    onError: (e) => showError({ title: "Erro ao excluir linha", description: e.message }),
  });

  // -- Handlers --

  const getRendimentosDoProduto = (produto_id) => {
    const vinculadas = todasComposicoes.filter(c => c.produto_id === produto_id).map(c => c.rendimento_id);
    if (vinculadas.length === 0) return rendimentos;
    return rendimentos.filter(r => vinculadas.includes(r.id));
  };

  const handleOpenEditLinha = (linha) => {
    setEditingLinha(linha);
    const rends = getRendimentosDoProduto(linha.produto.id);
    const vals = {};
    rends.forEach(r => {
      const key = `${r.id}|${linha.produto.id}|${linha.descricao_artigo}`;
      const v = valoresMap[key];
      vals[r.id] = v?.valor != null ? formatVal(v.valor) : "";
    });
    setLinhaValores(vals);
    setEditLinhaOpen(true);
  };

  const handleSalvarLinha = async () => {
    const rends = getRendimentosDoProduto(editingLinha.produto.id);
    for (const r of rends) {
      const raw = String(linhaValores[r.id] || "").replace(',', '.');
      const numVal = parseFloat(raw);
      const valor = isNaN(numVal) ? 0 : numVal;
      await upsertValorMutation.mutateAsync({
        rendimento_id: r.id,
        produto_id: editingLinha.produto.id,
        descricao_artigo: editingLinha.descricao_artigo,
        valor,
      });
    }
    setEditLinhaOpen(false);
    setEditingLinha(null);
    showSuccess({ title: "Valores salvos", description: "Rendimentos da linha atualizados com sucesso." });
  };

  const isLoading = loadingProdutos || loadingArtigos || loadingRendimentos;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{linhas.length} linha(s) • {rendimentos.length} composição(ões)</p>

        {/* Tabela de valores */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando dados...</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm" style={{ minWidth: '600px' }}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 whitespace-nowrap w-32">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 whitespace-nowrap">Nome do Produto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 whitespace-nowrap w-36">Código do Artigo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Descrição do Artigo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                      Nenhum produto com artigos cadastrado ainda.
                    </td>
                  </tr>
                )}
                {linhas.map((linha, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700 whitespace-nowrap">{linha.produto.codigo || "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate" title={linha.produto.nome_produto}>{linha.produto.nome_produto}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{linha.codigo_artigo}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={linha.descricao_artigo}>{linha.descricao_artigo}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <ActionButtons
                        onEdit={() => handleOpenEditLinha(linha)}
                        onDelete={() => showDelete({
                          title: "Excluir valores desta linha?",
                          description: "Deseja realmente excluir este rendimento? Essa ação não poderá ser desfeita.",
                          onConfirm: () => deletarLinhaMutation.mutateAsync({
                            produto_id: linha.produto.id,
                            descricao_artigo: linha.descricao_artigo,
                          }),
                        })}
                      />
                    </td>
                  </tr>
                ))}
                </tbody>
            </table>
          </div>
        )}



        {/* Modal editar valores da linha */}
        <Dialog open={editLinhaOpen} onOpenChange={v => { if (!v) { setEditLinhaOpen(false); setEditingLinha(null); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Rendimentos</DialogTitle>
            </DialogHeader>
            {editingLinha && (
              <div className="py-2 space-y-1 text-sm text-slate-500 mb-2">
                <p><span className="font-medium text-slate-700">Produto:</span> {editingLinha.produto.nome_produto}</p>
                <p><span className="font-medium text-slate-700">Artigo:</span> {editingLinha.descricao_artigo}</p>
              </div>
            )}
            <div className="space-y-3 py-1">
              {(editingLinha ? getRendimentosDoProduto(editingLinha.produto.id) : rendimentos).map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700 w-40 truncate" title={r.nome}>{r.nome}</label>
                  <Input
                    className="w-32 text-right text-sm"
                    placeholder=""
                    value={linhaValores[r.id] ?? ""}
                    onChange={e => setLinhaValores(prev => ({ ...prev, [r.id]: e.target.value.replace(/[^0-9.,]/g, '') }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="outline" onClick={() => { setEditLinhaOpen(false); setEditingLinha(null); }}>Cancelar</Button>
              <Button
                onClick={handleSalvarLinha}
                disabled={upsertValorMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {upsertValorMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}