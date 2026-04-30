import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, X } from 'lucide-react';

function parseBRL(str) {
  const cleaned = String(str).replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function formatBRLInput(raw) {
  const digits = raw.replace(/[^\d]/g, '');
  const num = parseFloat(digits) / 100;
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBRLDisplay(value) {
  if (!value) return 'R$ 0,00';
  const num = typeof value === 'string' ? parseBRL(value) : value;
  if (!num) return 'R$ 0,00';
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CRMNovaOportunidadeModal({ empresaId, etapas, funil, currentUser, onClose, onSaved }) {
  const { showError, showSuccess } = useGlobalAlert();

  const [form, setForm] = useState({
    nome: '',
    linha_comercial_id: '',
    cor_id: '',
    quantidade: '',
    valor_unitario: '',
    etapa_id: etapas?.[0]?.id || '',
    observacoes: '',
  });

  const [linhasComerciais, setLinhasComerciais] = useState([]);
  const [cores, setCores] = useState([]);
  const [saving, setSaving] = useState(false);

  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteResults, setClienteResults] = useState([]);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [searchingCliente, setSearchingCliente] = useState(false);
  const clienteDropdownRef = useRef(null);

  const [coresQuery, setCoresQuery] = useState('');
  const [coresResults, setCoresResults] = useState([]);
  const [showCoresDropdown, setShowCoresDropdown] = useState(false);
  const coresDropdownRef = useRef(null);

  const qtd = parseFloat(form.quantidade) || 0;
  const vu = parseBRL(form.valor_unitario) || 0;
  const valorEstimado = qtd * vu;

  useEffect(() => {
    if (etapas?.length > 0 && !form.etapa_id) {
      setForm(p => ({ ...p, etapa_id: etapas[0].id }));
    }
  }, [etapas?.length]);

  useEffect(() => {
    if (!supabase || !empresaId) return;
    supabase.from('config_tecido_linha_comercial').select('*').eq('empresa_id', empresaId).is('deleted_at', null)
      .then(({ data }) => setLinhasComerciais(data || []));
    supabase.from('config_tecido_cor').select('id,cor_nome,codigo_cor').eq('empresa_id', empresaId).is('deleted_at', null)
      .then(({ data }) => setCores(data || []));
  }, [empresaId]);

  useEffect(() => {
    const handler = (e) => {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target)) {
        setShowClienteDropdown(false);
      }
      if (coresDropdownRef.current && !coresDropdownRef.current.contains(e.target)) {
        setShowCoresDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!clienteQuery || clienteQuery.length < 2) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCliente(true);
      try {
        const { data: todos } = await supabase
          .from('clientes')
          .select('id,nome_cliente,nome_fantasia')
          .eq('empresa_id', empresaId)
          .or(`nome_cliente.ilike.%${clienteQuery}%,nome_fantasia.ilike.%${clienteQuery}%`)
          .limit(8);
        setClienteResults(todos || []);
        setShowClienteDropdown(true);
      } catch {
        setClienteResults([]);
      } finally {
        setSearchingCliente(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteQuery, empresaId]);

  useEffect(() => {
    if (!coresQuery || coresQuery.length < 1) {
      const filtrados = cores.slice(0, 10);
      setCoresResults(filtrados);
      setShowCoresDropdown(filtrados.length > 0);
      return;
    }
    const q = coresQuery.toLowerCase();
    const filtrados = cores.filter(c =>
      c.cor_nome?.toLowerCase().includes(q)
    ).slice(0, 10);
    setCoresResults(filtrados);
    setShowCoresDropdown(true);
  }, [coresQuery, cores]);

  const selecionarCliente = (cliente) => {
    const nome = cliente.nome_fantasia || cliente.nome_cliente;
    setClienteQuery(nome);
    setClienteNome(nome);
    setShowClienteDropdown(false);
  };

  const limparCliente = () => {
    setClienteQuery('');
    setClienteNome('');
    setShowClienteDropdown(false);
  };

  const selecionarCor = (cor) => {
    set('cor_id', cor.id);
    setCoresQuery(cor.cor_nome);
    setShowCoresDropdown(false);
  };

  const limparCor = () => {
    set('cor_id', '');
    setCoresQuery('');
    setShowCoresDropdown(false);
  };

  const handleValorUnitarioChange = (e) => {
    setForm(p => ({ ...p, valor_unitario: formatBRLInput(e.target.value) }));
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const salvar = async () => {
    const qtdNum = parseFloat(form.quantidade);
    const vuNum = parseBRL(form.valor_unitario);

    if (!form.linha_comercial_id || !form.cor_id || !qtdNum || qtdNum <= 0 || !vuNum || vuNum <= 0) {
      showError({ title: 'Campos obrigatórios', description: 'Preencha todos os campos corretamente' });
      return;
    }

    setSaving(true);
    try {
      const toUUID = v => (v && v !== '' ? v : null);
      
      const linhaSelecionada = linhasComerciais.find(l => l.id === form.linha_comercial_id);
      const corSelecionada = cores.find(c => c.id === form.cor_id);

      const data = {
        empresa_id: empresaId,
        linha_comercial_id: form.linha_comercial_id,
        cor_id: form.cor_id,
        titulo: form.nome.trim() || `${linhaSelecionada?.linha_nome || ''} - ${corSelecionada?.cor_nome || ''}`,
        artigo_nome: linhaSelecionada?.linha_nome || null,
        cor_nome: corSelecionada?.cor_nome || null,
        cliente_nome: clienteNome || clienteQuery || null,
        quantidade: qtdNum,
        valor_unitario: vuNum,
        valor: qtdNum * vuNum,
        etapa_id: toUUID(form.etapa_id),
        observacoes: form.observacoes || null,
        funil_id: toUUID(funil?.id),
        usuario_id: currentUser?.id || null,
        responsavel_id: currentUser?.id || null,
        responsavel_nome: currentUser?.nome || currentUser?.full_name || currentUser?.email || null,
        status: 'aberto',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: novaOp, error: errOp } = await supabase.from('crm_oportunidades').insert(data).select().single();
      if (errOp) throw new Error(errOp.message);

      if (novaOp?.id) {
        const responsavelId = currentUser?.id || currentUser?.email || null;
        await Promise.all([
          supabase.from('crm_oportunidade_historico').insert({ oportunidade_id: novaOp.id, acao: 'criacao', descricao: 'Oportunidade criada' }),
          supabase.from('crm_tarefas').insert({ titulo: 'Primeiro contato', tipo: 'Ligação', data_execucao: new Date().toISOString(), oportunidade_id: novaOp.id, responsavel_id: responsavelId, status: 'pendente' }),
        ]);
      }

      showSuccess({ title: 'Oportunidade criada', description: 'Registro salvo com sucesso' });
      onSaved();
    } catch (e) {
      showError({ title: 'Erro ao salvar', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome da Oportunidade</label>
            <Input
              placeholder="Ex: Pedido Uniforme Empresa X..."
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Linha Comercial *</label>
            <Select value={form.linha_comercial_id} onValueChange={v => set('linha_comercial_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a linha comercial..." />
              </SelectTrigger>
              <SelectContent>
                {linhasComerciais.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.linha_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Cor *</label>
            <div className="relative" ref={coresDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  className="pl-8 pr-8"
                  placeholder="Buscar cor..."
                  value={coresQuery}
                  onChange={e => setCoresQuery(e.target.value)}
                  onFocus={() => coresResults.length > 0 && setShowCoresDropdown(true)}
                />
                {coresQuery && (
                  <button type="button" onClick={limparCor} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {showCoresDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {coresResults.length > 0 ? (
                    coresResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selecionarCor(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 flex items-center gap-2"
                      >
                        <div className="h-4 w-4 rounded border border-slate-300" style={{ backgroundColor: c.codigo_cor || '#ccc' }} />
                        <span className="font-medium text-slate-800">{c.cor_nome}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400">Nenhuma cor encontrada</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Quantidade *</label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 100"
                value={form.quantidade}
                onChange={e => set('quantidade', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Valor Unitário *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">R$</span>
                <Input
                  className="pl-8"
                  placeholder="0,00"
                  value={form.valor_unitario}
                  onChange={handleValorUnitarioChange}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Valor Estimado</span>
            <span className="text-lg font-bold text-blue-700">{formatBRLDisplay(valorEstimado)}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Cliente</label>
            <div className="relative" ref={clienteDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  className="pl-8 pr-8"
                  placeholder="Buscar cliente ou digitar nome..."
                  value={clienteQuery}
                  onChange={e => {
                    setClienteQuery(e.target.value);
                    setClienteNome(e.target.value);
                  }}
                  onFocus={() => clienteResults.length > 0 && setShowClienteDropdown(true)}
                />
                {clienteQuery && (
                  <button type="button" onClick={limparCliente} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {showClienteDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchingCliente ? (
                    <div className="p-3 text-xs text-slate-400">Buscando...</div>
                  ) : clienteResults.length > 0 ? (
                    clienteResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selecionarCliente(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{c.nome_fantasia || c.nome_cliente}</span>
                        {c.nome_fantasia && <span className="text-xs text-slate-400 ml-2">{c.nome_cliente}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400">Nenhum cliente encontrado. O nome digitado será usado.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Etapa inicial</label>
            <Select key={(etapas || []).length} value={form.etapa_id} onValueChange={v => set('etapa_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etapa..." />
              </SelectTrigger>
              <SelectContent>
                {(etapas || []).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observações</label>
            <Textarea placeholder="Detalhes adicionais..." value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Oportunidade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}