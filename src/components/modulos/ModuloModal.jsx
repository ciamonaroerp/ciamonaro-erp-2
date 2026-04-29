import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, GripVertical } from "lucide-react";

// Lista centralizada de páginas disponíveis no sistema
const PAGINAS_DISPONIVEIS = [
  { pagina_nome: "Dashboard", label_menu: "Dashboard" },
  { pagina_nome: "ModulosPage", label_menu: "Módulos do ERP" },
  { pagina_nome: "DeployManager", label_menu: "Deploy Manager" },
  { pagina_nome: "DeployManagerV2", label_menu: "Deploy Manager V2" },
  { pagina_nome: "ComercialPage", label_menu: "Comercial" },
  { pagina_nome: "ComercialOrcamentosPage", label_menu: "Orçamentos" },
  { pagina_nome: "CRMPage", label_menu: "CRM" },
  { pagina_nome: "CRMDashboardPage", label_menu: "Dashboard CRM" },
  { pagina_nome: "CRMTarefasPage", label_menu: "Tarefas CRM" },
  { pagina_nome: "CRMRelatoriosPage", label_menu: "Relatórios CRM" },
  { pagina_nome: "CRMDetalhePage", label_menu: "Detalhes CRM" },
  { pagina_nome: "FinanceiroPage", label_menu: "Financeiro" },
  { pagina_nome: "FinanceiroConfiguracoesPage", label_menu: "Configurações Financeiras" },
  { pagina_nome: "FinanceiroCalculadoraFinanciamento", label_menu: "Calculadora de Financiamento" },
  { pagina_nome: "MetasCustosPage", label_menu: "Metas e Custos" },
  { pagina_nome: "ComprasPage", label_menu: "Compras" },
  { pagina_nome: "EstoqueMpPage", label_menu: "Estoque MP" },
  { pagina_nome: "EstoquePaPage", label_menu: "Estoque PA" },
  { pagina_nome: "EstoqueControlePage", label_menu: "Controle de Estoque" },
  { pagina_nome: "PpcpPage", label_menu: "PPCP" },
  { pagina_nome: "LogisticaPage", label_menu: "Logística" },
  { pagina_nome: "ProducaoPage", label_menu: "Produção" },
  { pagina_nome: "QualidadePage", label_menu: "Qualidade" },
  { pagina_nome: "EmbalagemPage", label_menu: "Embalagem" },
  { pagina_nome: "FiscalPage", label_menu: "Fiscal" },
  { pagina_nome: "HistoricoPrecosPage", label_menu: "Histórico de Preços" },
  { pagina_nome: "ClientesPage", label_menu: "Clientes" },
  { pagina_nome: "FornecedoresPage", label_menu: "Fornecedores" },
  { pagina_nome: "Transportadoras", label_menu: "Transportadoras" },
  { pagina_nome: "ModalidadeFrete", label_menu: "Modalidade de Frete" },
  { pagina_nome: "ConfiguracaoTecidoPage", label_menu: "Configuração do Tecido" },
  { pagina_nome: "ProdutoComercialPage", label_menu: "Produtos Comerciais" },
  { pagina_nome: "CustoProdutoPage", label_menu: "Custo do Produto" },
  { pagina_nome: "ServicosPage", label_menu: "Serviços" },
  { pagina_nome: "ConfiguracaoExtrasPage", label_menu: "Configuração Extras" },
  { pagina_nome: "Usuarios", label_menu: "Usuários" },
  { pagina_nome: "InformacoesPage", label_menu: "Informações" },
  { pagina_nome: "EmpresasConfigPage", label_menu: "Configurações da Empresa" },
  { pagina_nome: "IntegracoesERP", label_menu: "Integrações" },
  { pagina_nome: "LogsAuditoria", label_menu: "Logs de Auditoria" },
  { pagina_nome: "SistemaLogsPage", label_menu: "Logs do Sistema" },
  { pagina_nome: "SistemaAlertasPage", label_menu: "Alertas do Sistema" },
  { pagina_nome: "DeployManagerSaaS", label_menu: "Deploy Manager SaaS" },
];

export default function ModuloModal({ open, onClose, editingRow, empresa_id, onSubmit, isSubmitting }) {
  const [dadosModulo, setDadosModulo] = useState({ nome_modulo: "", status: "Preparado" });
  const [paginasSelecionadas, setPaginasSelecionadas] = useState([]);
  const [paginaParaAdicionar, setPaginaParaAdicionar] = useState("");

  // Carrega páginas já vinculadas ao editar
  const { data: paginasVinculadas, isLoading: loadingPaginas } = useQuery({
    queryKey: ["modulo-paginas", empresa_id, editingRow?.nome_modulo],
    queryFn: async () => {
      const { data } = await supabase.from("modulo_paginas").select("*").eq("empresa_id", empresa_id).eq("modulo_nome", editingRow?.nome_modulo);
      return data || [];
    },
    enabled: open && !!editingRow && !!empresa_id,
  });

  // Carrega mapa de vínculos de todas as páginas (para exibir "Vinculado em: ...")
  const { data: vinculosPaginas } = useQuery({
    queryKey: ["vinculos-paginas", empresa_id],
    queryFn: async () => {
      const { data } = await supabase.from("modulo_paginas").select("pagina_nome,modulo_nome").eq("empresa_id", empresa_id);
      const mapa = {};
      (data || []).forEach(r => {
        if (!mapa[r.pagina_nome]) mapa[r.pagina_nome] = [];
        mapa[r.pagina_nome].push(r.modulo_nome);
      });
      return mapa;
    },
    enabled: open && !!empresa_id,
  });

  useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setDadosModulo({ nome_modulo: editingRow.nome_modulo, status: editingRow.status || "Preparado" });
      // Não limpa paginasSelecionadas aqui — será preenchido pelo useEffect de paginasVinculadas
    } else {
      setDadosModulo({ nome_modulo: "", status: "Preparado" });
      setPaginasSelecionadas([]);
    }
  }, [open, editingRow?.id]);

  useEffect(() => {
    if (paginasVinculadas && editingRow) {
      // Deduplica por pagina_nome antes de setar
      const unicas = paginasVinculadas.filter(
        (p, idx, arr) => arr.findIndex(x => x.pagina_nome === p.pagina_nome) === idx
      );
      setPaginasSelecionadas(unicas);
    }
  }, [paginasVinculadas]);

  const handleAdicionarPagina = () => {
    if (!paginaParaAdicionar) return;
    const jaExiste = paginasSelecionadas.some(p => p.pagina_nome === paginaParaAdicionar);
    if (jaExiste) return;
    const info = PAGINAS_DISPONIVEIS.find(p => p.pagina_nome === paginaParaAdicionar);
    setPaginasSelecionadas(prev => [...prev, {
      pagina_nome: paginaParaAdicionar,
      label_menu: info?.label_menu || paginaParaAdicionar,
      icone: null,
      ordem: prev.length,
    }]);
    setPaginaParaAdicionar("");
  };

  const handleRemoverPagina = (pagina_nome) => {
    setPaginasSelecionadas(prev => prev.filter(p => p.pagina_nome !== pagina_nome));
  };

  const handleMoverPagina = (index, direcao) => {
    const novaLista = [...paginasSelecionadas];
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= novaLista.length) return;
    [novaLista[index], novaLista[novoIndex]] = [novaLista[novoIndex], novaLista[index]];
    setPaginasSelecionadas(novaLista.map((p, i) => ({ ...p, ordem: i })));
  };

  const handleEditarLabel = (pagina_nome, novoLabel) => {
    setPaginasSelecionadas(prev =>
      prev.map(p => p.pagina_nome === pagina_nome ? { ...p, label_menu: novoLabel } : p)
    );
  };

  // Filtra páginas que ainda não foram adicionadas a este módulo (mas permite já vinculadas em outros)
  const paginasDisponivelParaAdicionar = PAGINAS_DISPONIVEIS
    .filter(p => !paginasSelecionadas.some(s => s.pagina_nome === p.pagina_nome))
    .sort((a, b) => a.label_menu.localeCompare(b.label_menu, 'pt-BR'));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRow ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dados do módulo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Módulo *</Label>
              <Input
                value={dadosModulo.nome_modulo}
                onChange={e => setDadosModulo(p => ({ ...p, nome_modulo: e.target.value }))}
                placeholder="Ex: Financeiro"
                disabled={!!editingRow}
              />
              {editingRow && <p className="text-xs text-muted-foreground">Nome não pode ser alterado.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={dadosModulo.status}
                onValueChange={v => setDadosModulo(p => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Preparado">Preparado</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Páginas vinculadas */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Páginas do Menu</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecione as páginas que aparecerão no menu lateral deste módulo.
              </p>
            </div>

            {/* Adicionar página */}
            <div className="flex gap-2">
              <Select value={paginaParaAdicionar} onValueChange={setPaginaParaAdicionar}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar página para adicionar..." />
                </SelectTrigger>
                <SelectContent>
                  {paginasDisponivelParaAdicionar.map(p => {
                    const modulos = vinculosPaginas?.[p.pagina_nome] || [];
                    // Filtra o módulo atual da listagem de vínculos para não confundir
                    const modulosExternos = modulos.filter(m => m !== editingRow?.nome_modulo);
                    return (
                      <SelectItem key={p.pagina_nome} value={p.pagina_nome}>
                        <div className="flex flex-col gap-0.5 py-0.5">
                          <span>{p.label_menu} <span className="text-muted-foreground text-xs">({p.pagina_nome})</span></span>
                          {modulosExternos.length > 0 && (
                            <span className="text-xs text-slate-400">
                              Vinculado em: {modulosExternos.join(", ")}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAdicionarPagina}
                disabled={!paginaParaAdicionar}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Lista de páginas selecionadas */}
            {loadingPaginas ? (
              <div className="text-sm text-muted-foreground py-2">Carregando páginas...</div>
            ) : paginasSelecionadas.length === 0 ? (
              <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                Nenhuma página vinculada. Adicione páginas acima.
              </div>
            ) : (
              <div className="space-y-2">
                {paginasSelecionadas.map((pagina, index) => (
                  <div
                    key={pagina.pagina_nome}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 border rounded-lg"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoverPagina(index, -1)}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                      >▲</button>
                      <button
                        type="button"
                        onClick={() => handleMoverPagina(index, 1)}
                        disabled={index === paginasSelecionadas.length - 1}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                      >▼</button>
                    </div>
                    <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Input
                        value={pagina.label_menu || pagina.pagina_nome}
                        onChange={e => handleEditarLabel(pagina.pagina_nome, e.target.value)}
                        className="h-7 text-sm"
                        placeholder="Label do menu"
                      />
                    </div>
                    <Badge variant="outline" className="text-xs font-mono shrink-0 max-w-[140px] truncate">
                      {pagina.pagina_nome}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleRemoverPagina(pagina.pagina_nome)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSubmit({ dadosModulo, paginasSelecionadas })}
            disabled={isSubmitting || !dadosModulo.nome_modulo}
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}