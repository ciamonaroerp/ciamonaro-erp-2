import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronDown, ChevronRight, Search, Plus, ArrowLeftRight,
  Package, MapPin, RefreshCw, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

// ─── helpers ────────────────────────────────────────────────────────────────
async function crud({ action, tabela, empresa_id, filtros, dados }) {
  if (action === 'list') {
    let q = supabase.from(tabela).select('*');
    if (empresa_id) q = q.eq('empresa_id', empresa_id);
    if (filtros) Object.entries(filtros).forEach(([k, v]) => { q = q.eq(k, v); });
    const { data } = await q;
    return { data: { data: data || [] } };
  }
  if (action === 'create') {
    const { data } = await supabase.from(tabela).insert({ ...dados, empresa_id }).select().single();
    return { data: { data } };
  }
  return { data: { data: [] } };
}

function showError(msg) { toast.error(msg); }
function showSuccess(msg) { toast.success(msg); }

// ─── component ──────────────────────────────────────────────────────────────
export default function EstoqueControlePage() {
  const { empresa_id } = useEmpresa();
  const queryClient = useQueryClient();
  const { showError: showGlobalError } = useGlobalAlert();
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [modalMovimentacao, setModalMovimentacao] = useState(false);
  const [modalLocal, setModalLocal] = useState(false);
  const [codigoSearch, setCodigoSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const FORM_DEFAULT = { codigo_unico: '', tipo: 'TRANSFERENCIA', quantidade: '', local_origem_id: '', local_destino_id: '', observacao: '', documento_origem: '', documento_id: '' };
  const [formMov, setFormMov] = useState(FORM_DEFAULT);
  const [formLocal, setFormLocal] = useState({ nome: '', tipo: 'DEPOSITO' });

  // ─── realtime subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (!empresa_id) return;
    const channel = supabase
      .channel(`estoque_realtime_${empresa_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_movimentacoes', filter: `empresa_id=eq.${empresa_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['estoque_movimentacoes', empresa_id] });
        queryClient.invalidateQueries({ queryKey: ['estoque_saldo', empresa_id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_saldo', filter: `empresa_id=eq.${empresa_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['estoque_saldo', empresa_id] });
      })
      .subscribe();
    return () => { channel?.unsubscribe(); };
  }, [empresa_id]);

  // ─── queries ───────────────────────────────────────────────────────────────
  const { data: locais = [], isLoading: loadingLocais } = useQuery({
    queryKey: ['estoque_locais', empresa_id],
    enabled: !!empresa_id,
    queryFn: async () => {
      const r = await crud({ action: 'list', tabela: 'estoque_locais', empresa_id, filtros: { ativo: true } });
      return r.data?.data || [];
    },
  });

  const { data: saldos = [], isLoading: loadingSaldos } = useQuery({
    queryKey: ['estoque_saldo', empresa_id],
    enabled: !!empresa_id,
    queryFn: async () => {
      const r = await crud({ action: 'list', tabela: 'estoque_saldo', empresa_id });
      // Se a tabela não existir ainda, retorna vazio silenciosamente
      return r.data?.data || [];
    },
  });

  const { data: movs = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['estoque_movimentacoes', empresa_id],
    enabled: !!empresa_id,
    queryFn: async () => {
      const r = await crud({ action: 'list', tabela: 'estoque_movimentacoes', empresa_id });
      return r.data?.data || [];
    },
  });

  const { data: vinculos = [], isLoading: loadingVinculos } = useQuery({
    queryKey: ['config_vinculos', empresa_id],
    enabled: !!empresa_id,
    queryFn: async () => {
      const r = await crud({ action: 'list', tabela: 'config_vinculos', empresa_id });
      return r.data?.data || [];
    },
  });

  // Detecta se a tabela estoque_saldo_atual está em uso
  const usandoSaldoOtimizado = saldos.length > 0;

  // ─── saldos: usa estoque_saldo_atual se disponível, senão calcula via movimentações ───
  const resumo = useMemo(() => {
    if (!vinculos.length) return [];

    const movsAtivos = movs.filter(m => !m.deleted_at);

    let saldoPorCodigoLocal = {};

    if (usandoSaldoOtimizado) {
      // Fonte otimizada: estoque_saldo_atual
      for (const s of saldos) {
        const cu = s.codigo_unico;
        if (!cu) continue;
        if (!saldoPorCodigoLocal[cu]) saldoPorCodigoLocal[cu] = {};
        saldoPorCodigoLocal[cu][s.local_id] = parseFloat(s.saldo) || 0;
      }
    } else {
      // Fallback: calcula via SUM de movimentações
      for (const m of movsAtivos) {
        const cu = m.codigo_unico;
        if (!cu) continue;
        const qtd = parseFloat(m.quantidade) || 0;
        if (!saldoPorCodigoLocal[cu]) saldoPorCodigoLocal[cu] = {};
        if (m.local_destino_id) {
          saldoPorCodigoLocal[cu][m.local_destino_id] = (saldoPorCodigoLocal[cu][m.local_destino_id] || 0) + qtd;
        }
        if (m.local_origem_id) {
          saldoPorCodigoLocal[cu][m.local_origem_id] = (saldoPorCodigoLocal[cu][m.local_origem_id] || 0) - qtd;
        }
      }
    }

    return vinculos
      .filter(v => !v.deleted_at && v.codigo_unico)
      .map(v => {
        const cu = v.codigo_unico;
        const saldoLocais = saldoPorCodigoLocal[cu] || {};
        const estoque_atual = Object.values(saldoLocais).reduce((a, b) => a + b, 0);
        return {
          codigo_unico: cu,
          artigo: v.artigo_nome || v.artigo_codigo || '—',
          cor: v.cor_nome || v.cor_codigo || '—',
          linha: v.linha_nome || v.linha_comercial_codigo || '—',
          estoque_atual,
          estoque_previsto: 0,
          estoque_negociacao: 0,
          estoque_a_receber: 0,
          saldoLocais,
          movsItem: movsAtivos.filter(m => m.codigo_unico === cu),
        };
      });
  }, [vinculos, saldos, movs, usandoSaldoOtimizado]);

  const resumoFiltrado = useMemo(() => {
    const sorted = [...resumo].sort((a, b) => b.estoque_atual - a.estoque_atual);
    if (!busca.trim()) return sorted.slice(0, 10);
    const t = busca.toLowerCase();
    return sorted.filter(r =>
      r.codigo_unico?.toLowerCase().includes(t) ||
      r.artigo?.toLowerCase().includes(t) ||
      r.cor?.toLowerCase().includes(t) ||
      r.linha?.toLowerCase().includes(t)
    );
  }, [resumo, busca]);

  // ─── mutations ────────────────────────────────────────────────────────────
  const criarMovimentacao = useMutation({
    mutationFn: async () => {
      if (!formMov.codigo_unico) throw new Error('Código único obrigatório');
      if (!formMov.quantidade || parseFloat(formMov.quantidade) <= 0) throw new Error('Quantidade inválida');
      const tem_destino = ['ENTRADA_XML', 'TRANSFERENCIA'].includes(formMov.tipo);
      const tem_origem = ['SAIDA_PRODUCAO', 'TRANSFERENCIA', 'AJUSTE'].includes(formMov.tipo);
      if (tem_destino && !formMov.local_destino_id) throw new Error('Informe o local de destino');
      if (tem_origem && !formMov.local_origem_id) throw new Error('Informe o local de origem');

      // Verificar saldo suficiente no local de origem
      if (tem_origem && formMov.local_origem_id) {
        const item = resumo.find(r => r.codigo_unico === formMov.codigo_unico);
        const saldoOrigem = item?.saldoLocais?.[formMov.local_origem_id] || 0;
        const qtdSolicitada = parseFloat(formMov.quantidade);
        if (saldoOrigem < qtdSolicitada) {
          const nomeOrig = nomeLocal(formMov.local_origem_id);
          throw new Error(`Saldo insuficiente em "${nomeOrig}": disponível ${saldoOrigem}, solicitado ${qtdSolicitada}`);
        }
      }

      await crud({
        action: 'create',
        tabela: 'estoque_movimentacoes',
        empresa_id,
        dados: {
          codigo_unico: formMov.codigo_unico,
          tipo: formMov.tipo,
          quantidade: parseFloat(formMov.quantidade),
          local_origem_id: formMov.local_origem_id || null,
          local_destino_id: formMov.local_destino_id || null,
          observacao: formMov.observacao || '',
          documento_origem: formMov.documento_origem || '',
          empresa_id,
        }
      });
    },
    onSuccess: () => {
      showSuccess('Movimentação registrada');
      setModalMovimentacao(false);
      setCodigoSearch('');
      setFormMov(FORM_DEFAULT);
      queryClient.invalidateQueries({ queryKey: ['estoque_saldo', empresa_id] });
      queryClient.invalidateQueries({ queryKey: ['estoque_movimentacoes', empresa_id] });
    },
    onError: (e) => {
      if (e.message.includes('Saldo insuficiente')) {
        setModalMovimentacao(false);
        setTimeout(() => showGlobalError({ title: 'Saldo Insuficiente', description: e.message }), 100);
      } else {
        showError(e.message);
      }
    },
    });

  const criarLocal = useMutation({
    mutationFn: async () => {
      if (!formLocal.nome.trim()) throw new Error('Nome obrigatório');
      await crud({ action: 'create', tabela: 'estoque_locais', empresa_id, dados: { ...formLocal, empresa_id } });
    },
    onSuccess: () => {
      showSuccess('Local criado');
      setModalLocal(false);
      setFormLocal({ nome: '', tipo: 'DEPOSITO' });
      queryClient.invalidateQueries(['estoque_locais', empresa_id]);
    },
    onError: (e) => showError(e.message),
  });

  const nomeLocal = (id) => locais.find(l => l.id === id)?.nome || id || '—';

  const isLoading = loadingLocais || loadingMovs || loadingVinculos || loadingSaldos;

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Estoque</h1>
          <p className="text-sm text-slate-500">Saldo consolidado por código único</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setModalLocal(true)}>
            <MapPin className="h-4 w-4 mr-1" />
            Locais
          </Button>
          <Button size="sm" onClick={() => setModalMovimentacao(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Movimentação
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Códigos únicos', value: resumo.length, icon: Package, color: 'text-blue-600' },
          { label: 'Com estoque', value: resumo.filter(r => r.estoque_atual > 0).length, icon: Package, color: 'text-green-600' },
          { label: 'Estoque negativo', value: resumo.filter(r => r.estoque_atual < 0).length, icon: Package, color: 'text-red-600' },
          { label: 'Locais ativos', value: locais.length, icon: MapPin, color: 'text-purple-600' },
          { label: 'Movimentações', value: movs.filter(m => !m.deleted_at).length, icon: ArrowLeftRight, color: 'text-orange-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-slate-500">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Buscar código, artigo, cor..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>
        {!busca.trim() && (
          <p className="text-xs text-slate-400">Exibindo {Math.min(resumo.length, 10)} de {resumo.length} itens — use a busca para ver mais</p>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-8"></TableHead>
              <TableHead>Código Único</TableHead>
              <TableHead>Artigo</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Linha Comercial</TableHead>
              <TableHead className="text-right">Atual</TableHead>
              <TableHead className="text-right text-slate-400">Previsto</TableHead>
              <TableHead className="text-right text-slate-400">Negociação</TableHead>
              <TableHead className="text-right text-slate-400">A Receber</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Carregando...
                </TableCell>
              </TableRow>
            ) : resumoFiltrado.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                  Nenhum item encontrado
                </TableCell>
              </TableRow>
            ) : (
              resumoFiltrado.map(item => (
                <>
                  <TableRow
                    key={item.codigo_unico}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandido(expandido === item.codigo_unico ? null : item.codigo_unico)}
                  >
                    <TableCell>
                      {expandido === item.codigo_unico
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </TableCell>
                    <TableCell className="font-mono font-medium text-sm">{item.codigo_unico}</TableCell>
                    <TableCell className="text-sm">{item.artigo}</TableCell>
                    <TableCell className="text-sm">{item.cor}</TableCell>
                    <TableCell className="text-sm">{item.linha}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.estoque_atual > 0 ? 'default' : 'secondary'} className="font-mono">
                        {Number(item.estoque_atual).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-400 text-sm">0</TableCell>
                    <TableCell className="text-right text-slate-400 text-sm">0</TableCell>
                    <TableCell className="text-right text-slate-400 text-sm">0</TableCell>
                  </TableRow>

                  {expandido === item.codigo_unico && (
                    <TableRow key={`${item.codigo_unico}-detail`}>
                      <TableCell colSpan={9} className="bg-slate-50 px-6 py-4">
                        <div className="space-y-4">
                          {/* Saldo por local */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Saldo por Local</p>
                            {Object.keys(item.saldoLocais).length === 0 ? (
                              <p className="text-sm text-slate-400">Sem saldo em nenhum local</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(item.saldoLocais).map(([localId, qtd]) => (
                                  <div key={localId} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                                    <MapPin className="h-3 w-3 text-slate-400" />
                                    <span className="text-slate-600">{nomeLocal(localId)}</span>
                                    <Badge variant="outline" className="font-mono">{Number(qtd).toFixed(2)}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Movimentações */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Movimentações</p>
                            {item.movsItem.length === 0 ? (
                              <p className="text-sm text-slate-400">Sem movimentações</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                      <th className="pb-1 pr-4">Data</th>
                                      <th className="pb-1 pr-4">Tipo</th>
                                      <th className="pb-1 pr-4">Qtd</th>
                                      <th className="pb-1 pr-4">Origem</th>
                                      <th className="pb-1 pr-4">Destino</th>
                                      <th className="pb-1 pr-4">Doc</th>
                                      <th className="pb-1">Obs</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.movsItem.map(m => (
                                      <tr key={m.id} className="border-b border-slate-100 last:border-0">
                                        <td className="py-1 pr-4 text-slate-500 text-xs whitespace-nowrap">{m.created_at ? new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : m.created_date ? new Date(m.created_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                        <td className="py-1 pr-4">
                                          <Badge variant="outline" className="text-xs">{m.tipo}</Badge>
                                        </td>
                                        <td className="py-1 pr-4 font-mono font-medium">{m.quantidade}</td>
                                        <td className="py-1 pr-4 text-slate-500">{nomeLocal(m.local_origem_id)}</td>
                                        <td className="py-1 pr-4 text-slate-500">{nomeLocal(m.local_destino_id)}</td>
                                        <td className="py-1 pr-4 text-slate-500">{m.documento_origem || '—'}</td>
                                        <td className="py-1 text-slate-500">{m.observacao || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Movimentação */}
      <Dialog open={modalMovimentacao} onOpenChange={(open) => { setModalMovimentacao(open); if (!open) { setCodigoSearch(''); setDropdownOpen(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 relative">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Código Único *</label>
                <Input
                  placeholder="Buscar por código, artigo, cor..."
                  value={codigoSearch}
                  onChange={e => { setCodigoSearch(e.target.value); setDropdownOpen(true); setFormMov(p => ({ ...p, codigo_unico: '' })); }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  autoComplete="off"
                />
                {formMov.codigo_unico && (
                  <p className="text-xs text-blue-600 mt-1 font-mono">Selecionado: {formMov.codigo_unico}</p>
                )}
                {dropdownOpen && codigoSearch.trim().length > 0 && (() => {
                  const t = codigoSearch.toLowerCase();
                  const filtered = resumo.filter(r =>
                    r.codigo_unico?.toLowerCase().includes(t) ||
                    r.artigo?.toLowerCase().includes(t) ||
                    r.cor?.toLowerCase().includes(t) ||
                    r.linha?.toLowerCase().includes(t)
                  ).slice(0, 10);
                  return filtered.length > 0 ? (
                    <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filtered.map(r => (
                        <button
                          key={r.codigo_unico}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                          onMouseDown={() => {
                            setFormMov(p => ({ ...p, codigo_unico: r.codigo_unico }));
                            setCodigoSearch(r.codigo_unico);
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="font-mono font-semibold text-sm text-slate-800">{r.codigo_unico}</span>
                          <span className="ml-2 text-xs text-slate-500">{r.artigo} · {r.cor} · {r.linha}</span>
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo *</label>
                <Select value={formMov.tipo} onValueChange={v => setFormMov(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFERENCIA">TRANSFERENCIA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Quantidade *</label>
                <Input
                  type="number" min="0.001" step="0.001"
                  placeholder="0"
                  value={formMov.quantidade}
                  onChange={e => setFormMov(p => ({ ...p, quantidade: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Local Origem *</label>
                <Select value={formMov.local_origem_id} onValueChange={v => setFormMov(p => ({ ...p, local_origem_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {locais.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                {formMov.local_origem_id && formMov.codigo_unico && (() => {
                  const item = resumo.find(r => r.codigo_unico === formMov.codigo_unico);
                  const saldo = item?.saldoLocais?.[formMov.local_origem_id] || 0;
                  return <p className="text-xs mt-1 text-slate-500">Saldo disponível: <span className={saldo > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{saldo}</span></p>;
                })()}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Local Destino *</label>
                <Select value={formMov.local_destino_id} onValueChange={v => setFormMov(p => ({ ...p, local_destino_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {locais.filter(l => l.id !== formMov.local_origem_id).map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Observação</label>
                <Input
                  placeholder="Observação opcional"
                  value={formMov.observacao}
                  onChange={e => setFormMov(p => ({ ...p, observacao: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalMovimentacao(false)}>Cancelar</Button>
            <Button onClick={() => criarMovimentacao.mutate()} disabled={criarMovimentacao.isPending}>
              {criarMovimentacao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Local */}
      <Dialog open={modalLocal} onOpenChange={setModalLocal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Locais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border border-slate-200 rounded-lg divide-y">
              {locais.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum local cadastrado</p>
              ) : (
                locais.map(l => (
                  <div key={l.id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{l.nome}</p>
                      <p className="text-xs text-slate-400">{l.tipo}</p>
                    </div>
                    <Badge variant={l.ativo ? 'default' : 'secondary'} className="text-xs">
                      {l.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Novo Local</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input
                  placeholder="Nome do local"
                  value={formLocal.nome}
                  onChange={e => setFormLocal(p => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Select value={formLocal.tipo} onValueChange={v => setFormLocal(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSITO">DEPOSITO</SelectItem>
                    <SelectItem value="CLIENTE">CLIENTE</SelectItem>
                    <SelectItem value="TERCEIRO">TERCEIRO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalLocal(false)}>Fechar</Button>
            <Button onClick={() => criarLocal.mutate()} disabled={criarLocal.isPending}>
              {criarLocal.isPending ? 'Salvando...' : 'Adicionar Local'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}