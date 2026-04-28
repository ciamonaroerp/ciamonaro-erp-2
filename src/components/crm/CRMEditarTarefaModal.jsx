import { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { useSupabaseAuth } from '@/components/context/SupabaseAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, History } from 'lucide-react';

const TIPOS = ['Ligação', 'E-mail', 'Reunião', 'Visita', 'Proposta', 'WhatsApp'];

const formatDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d.includes('T') ? d : d + 'T12:00');
  return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const CAMPO_LABELS = {
  titulo: 'Título',
  data_execucao: 'Data de execução',
  tipo: 'Tipo',
};

export default function CRMEditarTarefaModal({ tarefa, onClose, onSaved }) {
  const { showConfirm, showError, showSuccess } = useGlobalAlert();
  const { erpUsuario } = useSupabaseAuth();

  const [form, setForm] = useState({
    titulo: tarefa.titulo || '',
    data_execucao: tarefa.data_execucao ? tarefa.data_execucao.slice(0, 16) : '',
    tipo: tarefa.tipo || 'Ligação',
  });
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);

  useEffect(() => {
    carregarHistorico();
  }, [tarefa.id]);

  const carregarHistorico = async () => {
    setLoadingHist(true);
    try {
      const { data } = await supabase.from('crm_tarefas_historico').select('campo,valor_antigo,valor_novo,created_at,usuario_id').eq('tarefa_id', tarefa.id).order('created_at', { ascending: false }).limit(50);
      setHistorico(data || []);
    } catch {
      // silencioso — tabela pode não existir ainda
      setHistorico([]);
    } finally {
      setLoadingHist(false);
    }
  };

  const detectarAlteracoes = () => {
    const alteracoes = [];
    const original = {
      titulo: tarefa.titulo || '',
      data_execucao: tarefa.data_execucao ? tarefa.data_execucao.slice(0, 16) : '',
      tipo: tarefa.tipo || 'Ligação',
    };
    for (const campo of ['titulo', 'data_execucao', 'tipo']) {
      if (form[campo] !== original[campo]) {
        alteracoes.push({ campo, valor_antigo: original[campo], valor_novo: form[campo] });
      }
    }
    return alteracoes;
  };

  const executarAtualizacao = async () => {
    const alteracoes = detectarAlteracoes();
    if (alteracoes.length === 0) {
      showError({ title: 'Nenhuma alteração', description: 'Não há campos alterados para salvar.' });
      return;
    }

    setSaving(true);
    try {
      await supabase.from('crm_tarefas').update({ titulo: form.titulo, data_execucao: form.data_execucao || null, tipo: form.tipo, updated_at: new Date().toISOString() }).eq('id', tarefa.id);
      await Promise.all(alteracoes.map(alt =>
        supabase.from('crm_tarefas_historico').insert({ tarefa_id: tarefa.id, campo: alt.campo, valor_antigo: alt.valor_antigo, valor_novo: alt.valor_novo, usuario_id: erpUsuario?.id || null })
      ));

      showSuccess({ title: 'Tarefa atualizada', description: `${alteracoes.length} campo(s) alterado(s) registrado(s) no histórico.` });
      onSaved?.();
      onClose();
    } catch (e) {
      showError({ title: 'Erro ao atualizar', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSalvar = () => {
    if (!form.titulo.trim()) {
      showError({ title: 'Título obrigatório', description: 'Informe o título da tarefa.' });
      return;
    }
    const alteracoes = detectarAlteracoes();
    if (alteracoes.length === 0) {
      showError({ title: 'Nenhuma alteração', description: 'Não há campos alterados para salvar.' });
      return;
    }
    showConfirm({
      title: 'Salvar alterações?',
      description: `${alteracoes.length} campo(s) serão registrados no histórico.`,
      confirmLabel: 'Salvar',
      onConfirm: executarAtualizacao,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edicao">
          <TabsList className="w-full">
            <TabsTrigger value="edicao" className="flex-1">Edição</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1 gap-1.5">
              <History className="h-3.5 w-3.5" />
              Histórico {historico.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{historico.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edicao" className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Título *</label>
              <Input
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Título da tarefa"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Data de execução</label>
              <Input
                type="datetime-local"
                value={form.data_execucao}
                onChange={e => setForm(p => ({ ...p, data_execucao: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button onClick={handleSalvar} disabled={saving} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar alterações
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="pt-2">
            {loadingHist ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : historico.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">Nenhuma alteração registrada.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {historico.map((h, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{CAMPO_LABELS[h.campo] || h.campo}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(h.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded line-through">{h.valor_antigo || '(vazio)'}</span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{h.valor_novo || '(vazio)'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}