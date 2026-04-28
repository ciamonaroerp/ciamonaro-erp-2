import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { supabase } from "@/components/lib/supabaseClient";
import { configTecidoService } from "@/components/services/configuracoesTecidoService";
import { Loader2, Link2, Package, Search, AlertCircle, ChevronDown, X } from "lucide-react";

function ProdutoCombobox({ produtos, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtrados = useMemo(() => {
  if (!query.trim()) return produtos;
  const q = query.toLowerCase();
  return produtos.filter(p =>
    (p.codigo_unico || "").toLowerCase().includes(q) ||
    (p.nome_artigo || "").toLowerCase().includes(q) ||
    (p.nome_cor || "").toLowerCase().includes(q) ||
    (p.nome_linha_comercial || "").toLowerCase().includes(q)
    );
  }, [produtos, query]);

  const handleSelect = (p) => {
    onChange(p);
    setQuery("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  };

  return (
    <div className="relative">
      <label className="text-sm font-medium">Produto Interno *</label>
      <p className="text-xs text-slate-500 mb-1">Busque pelo código único, artigo ou cor</p>
      <div
        className="flex items-center border border-slate-300 rounded-md px-3 py-2 bg-white cursor-text gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          className="flex-1 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
          placeholder="Buscar produto..."
          value={query || (value && !open ? `${value.codigo_unico} — ${value.nome_artigo || ''} · ${value.nome_cor || ''}` : "")}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
        />
        {value && !query && (
          <button onClick={handleClear} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {filtrados.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">Nenhum produto encontrado</div>
            ) : filtrados.map(p => (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                onClick={() => handleSelect(p)}
              >
                <span className="font-mono text-xs font-bold text-blue-700">{p.codigo_unico}</span>
                {p.nome_artigo && (
                 <span className="ml-2 text-slate-600 text-xs">{p.nome_artigo} · {p.nome_cor} · {p.nome_linha_comercial}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function VincularProdutosTab({ empresa_id }) {
  const queryClient = useQueryClient();
  const { showConfirm, showSuccess, showError } = useGlobalAlert();

  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [itensNaoVinculados, setItensNaoVinculados] = useState([]);
  const [vinculandoNaoVinculados, setVinculandoNaoVinculados] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState(new Set());

  // Carrega notas fiscais
  const notasQuery = useQuery({
    queryKey: ["nfe-pendentes-vinculo", empresa_id],
    queryFn: async () => {
      const { data } = await supabase.from("nota_fiscal_importada").select("*").eq("empresa_id", empresa_id);
      return data || [];
    },
    enabled: !!empresa_id,
  });

  // Carrega fornecedores e tipos para filtrar apenas tecido
  const fornecedoresQuery = useQuery({
    queryKey: ["fornecedores-list", empresa_id],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("*").eq("empresa_id", empresa_id);
      return data || [];
    },
    enabled: !!empresa_id,
  });

  const tiposQuery = useQuery({
    queryKey: ["fornecedor-tipos"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedor_tipos").select("*");
      return data || [];
    },
  });

  // CNPJs de fornecedores do tipo Tecido
  const cnpjsTecido = useMemo(() => {
    const tipos = tiposQuery.data || [];
    const fornecedores = fornecedoresQuery.data || [];
    const tiposIdTecido = new Set(
      tipos.filter(t => (t.nome || '').toLowerCase().includes('tecido') || t.usa_vinculo === true).map(t => t.id)
    );
    return new Set(
      fornecedores.filter(f => tiposIdTecido.has(f.tipo_id)).map(f => (f.documento || '').replace(/\D/g, ''))
    );
  }, [tiposQuery.data, fornecedoresQuery.data]);

  // Carrega produtos cadastrados em config_vinculos
  const vinculosQuery = useQuery({
    queryKey: ["config-tecido-vinculos", empresa_id],
    queryFn: () => configTecidoService.listarVinculos(empresa_id),
    enabled: !!empresa_id,
  });

  const produtosCadastrados = (vinculosQuery.data || []).filter(v =>
    !v.deleted_at && v.codigo_unico && v.nome_artigo && v.nome_cor && v.nome_linha_comercial
  );

  // Carrega itens não vinculados das notas fiscais
  React.useEffect(() => {
    const notas = notasQuery.data || [];
    const itens = [];
    const chaves = new Set();
    
    for (const nota of notas) {
      let itensNota;
      try { itensNota = typeof nota.itens === "string" ? JSON.parse(nota.itens) : nota.itens; } catch { continue; }
      if (!Array.isArray(itensNota)) continue;

      for (const item of itensNota) {
        // Pula apenas itens genuinamente vinculados (status confirmado e codigo real)
        const jaVinculado = item.status_vinculo === 'vinculado' && item.codigo_unico && !item.codigo_unico.startsWith('NEW_');
        if (jaVinculado) continue;
        // Sem filtro por tipo de fornecedor — mostra todos os itens pendentes
        const chave = `${item.descricao_base || ""}||${item.descricao_complementar || ""}||${item.codigo_pedido || ""}`;
        if (!chaves.has(chave)) {
          chaves.add(chave);
          itens.push({
            descricao_base: item.descricao_base || "",
            descricao_complementar: item.descricao_complementar || "",
            codigo_pedido: item.codigo_pedido || "",
            quantidade: item.quantidade || 0,
            emitente_nome: nota.emitente_nome || "",
            fornecedor_id: nota.emitente_cnpj || "",
          });
        }
      }
    }
    
    setItensNaoVinculados(itens);
  }, [notasQuery.data]);

  const handleVincularNaoVinculados = async () => {
    if (!produtoSelecionado?.codigo_unico) {
      showError({ title: "Erro", description: "Selecione um produto antes de confirmar" });
      return;
    }

    if (itensSelecionados.size === 0) {
      showError({ title: "Erro", description: "Selecione pelo menos um item para vincular" });
      return;
    }

    setVinculandoNaoVinculados(true);
    try {
      const itensFiltrados = itensNaoVinculados.filter(
        item => itensSelecionados.has(`${item.descricao_base}||${item.descricao_complementar}||${item.codigo_pedido}`)
      );

      // Salva vínculos e aprendizado manual
      for (const item of itensFiltrados) {
       try {
         const descricaoComercialUnificada = [produtoSelecionado.nome_artigo || '', produtoSelecionado.nome_cor || ''].filter(Boolean).join(' ') || null;
         await supabase.from('config_vinculos').upsert({
           empresa_id,
           codigo_unico: produtoSelecionado.codigo_unico,
           artigo_nome: produtoSelecionado.nome_artigo || '',
           cor_nome: produtoSelecionado.nome_cor || '',
           linha_nome: produtoSelecionado.nome_linha_comercial || '',
           descricao_base: item.descricao_base || '',
           descricao_complementar: item.descricao_complementar || '',
           descricao_comercial_unificada: descricaoComercialUnificada,
           fornecedor_id: item.fornecedor_id || null,
         }, { onConflict: 'empresa_id,codigo_unico' });
          const descRaw = item.descricao_complementar || item.descricao_base || '';
          await supabase.from('vinculo_produto_nf').upsert({
            empresa_id,
            fornecedor_id: (item.fornecedor_id || '').replace(/\D/g, ''),
            descricao_nf: descRaw,
            descricao_normalizada: descRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(),
            codigo_unico: produtoSelecionado.codigo_unico,
            score: 1,
            origem: 'manual',
          }, { onConflict: 'empresa_id,fornecedor_id,descricao_normalizada' }).catch(() => null);
        } catch (e) {
          console.warn(`Aviso ao vincular item: ${e.message}`);
        }
      }

      // Invalida todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["config-tecido-vinculos"] });
      queryClient.invalidateQueries({ queryKey: ["nfe-pendentes-vinculo"] });
      queryClient.invalidateQueries({ queryKey: ["nfe-itens"] });
      queryClient.refetchQueries({ queryKey: ["nfe-pendentes-vinculo"] });

      const countRemoved = itensSelecionados.size;
      setItensSelecionados(new Set());
      showSuccess({
        title: "Itens vinculados!",
        description: `${countRemoved} item(s) vinculado(s) com sucesso!`,
      });
    } catch (error) {
      showError({ title: "Erro ao vincular", description: error.message });
    } finally {
      setVinculandoNaoVinculados(false);
    }
  };

  const isLoading = notasQuery.isLoading && itensNaoVinculados.length === 0;
  const totalPendentes = itensNaoVinculados.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-slate-600">
            {totalPendentes} pendente(s)
          </Badge>
        </div>
      </div>



      {/* Card para itens não vinculados */}
      {itensNaoVinculados.length > 0 && (
        <Card className="p-5 border-2 border-amber-300 bg-amber-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Itens Não Vinculados — Vínculo Manual</h3>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            Os seguintes itens não foram vinculados automaticamente. Selecione um produto abaixo para vincular todos eles:
          </p>

          {/* Tabela compacta */}
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="px-3 py-2 text-left font-medium text-slate-600 w-10">
                    <input
                      type="checkbox"
                      checked={itensSelecionados.size === itensNaoVinculados.length && itensNaoVinculados.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSet = new Set(
                            itensNaoVinculados.map(item => `${item.descricao_base}||${item.descricao_complementar}||${item.codigo_pedido}`)
                          );
                          setItensSelecionados(newSet);
                        } else {
                          setItensSelecionados(new Set());
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Descrição Base</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Complementar</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">Qtd</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Fornecedor</th>
                </tr>
              </thead>
              <tbody>
                {itensNaoVinculados.map((item, idx) => {
                  const itemKey = `${item.descricao_base}||${item.descricao_complementar}||${item.codigo_pedido}`;
                  const isChecked = itensSelecionados.has(itemKey);
                  return (
                    <tr key={idx} className="border-b hover:bg-amber-100/50 last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSet = new Set(itensSelecionados);
                            if (e.target.checked) {
                              newSet.add(itemKey);
                            } else {
                              newSet.delete(itemKey);
                            }
                            setItensSelecionados(newSet);
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-700">{item.descricao_base}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{item.descricao_complementar || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{item.quantidade}</td>
                      <td className="px-3 py-2 text-slate-600 text-xs truncate">{item.emitente_nome}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Seleção e ação */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Selecione o Produto para Vincular</label>
              <ProdutoCombobox
                produtos={produtosCadastrados}
                value={produtoSelecionado}
                onChange={setProdutoSelecionado}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setProdutoSelecionado(null); setItensSelecionados(new Set()); }}
                disabled={vinculandoNaoVinculados}
              >
                Descartar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleVincularNaoVinculados}
                disabled={vinculandoNaoVinculados || !produtoSelecionado?.codigo_unico || itensSelecionados.size === 0}
              >
                {vinculandoNaoVinculados ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Vinculando...</> : `Vincular ${itensSelecionados.size} Item(s)`}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}