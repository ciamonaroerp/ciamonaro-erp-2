import { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, FileText, Clock, Plus } from 'lucide-react';

export default function CRMDetalhesModal({ oportunidadeId, empresaId, onClose, onRefresh }) {
  const { showConfirm, showError, showSuccess } = useGlobalAlert();

  const [op, setOp] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [motivosPerda, setMotivosPerda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [motivoSelecionado, setMotivoSelecionado] = useState('');
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', tipo: 'Ligação', data_execucao: '' });
  const [showTarefaForm, setShowTarefaForm] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [opRes, histRes, tarefasRes, motivosRes] = await Promise.all([
        supabase.from('crm_oportunidades').select('id,titulo,cliente_nome,valor,etapa_id,responsavel_nome,status,observacoes,motivo_perda_nome,motivo_ganho_nome,orcamento_id,created_at').eq('id', oportunidadeId).maybeSingle(),
        supabase.from('crm_oportunidade_historico').select('id,acao,descricao,usuario_nome,created_at').eq('oportunidade_id', oportunidadeId).order('created_at', { ascending: false }),
        supabase.from('crm_tarefas').select('id,titulo,tipo,data_execucao,status,responsavel_nome').eq('oportunidade_id', oportunidadeId).order('data_execucao', { ascending: true }),
        supabase.from('crm_motivos_perda').select('id,nome').eq('empresa_id', empresaId),
      ]);
      setOp(opRes.data);
      setHistorico(histRes.data || []);
      setTarefas(tarefasRes.data || []);
      setMotivosPerda(motivosRes.data || []);
    } catch (e) {
      showError({ title: 'Erro ao carregar detalhes', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [oportunidadeId]);

  const marcarGanho = () => {
    showConfirm({
      title: 'Marcar como Ganho?',
      description: 'A oportunidade será encerrada como GANHO.',
      onConfirm: async () => {
        try {
          await supabase.from('crm_oportunidades').update({ status: 'ganho', updated_at: new Date().toISOString() }).eq('id', oportunidadeId);
          await supabase.from('crm_oportunidade_historico').insert({ empresa_id: empresaId, oportunidade_id: oportunidadeId, acao: 'ganho', descricao: 'Oportunidade marcada como GANHO', created_at: new Date().toISOString() });
          showSuccess({ title: 'Sucesso', description: 'Oportunidade marcada como GANHO!' });
          onRefresh();
        } catch (e) {
          showError({ title: 'Erro', description: e.message });
        }
      },
    });
  };

  const marcarPerda = () => {
    if (!motivoSelecionado) {
      showError({ title: 'Selecione um motivo', description: 'Informe o motivo da perda antes de continuar.' });
      return;
    }
    const motivo = motivosPerda.find(m => m.id === motivoSelecionado);
    showConfirm({
      title: 'Marcar como Perdido?',
      description: `Motivo: "${motivo?.nome}". Esta ação encerrará a oportunidade.`,
      onConfirm: async () => {
        try {
          await supabase.from('crm_oportunidades').update({ status: 'perdido', motivo_perda_id: motivoSelecionado, motivo_perda_nome: motivo?.nome, updated_at: new Date().toISOString() }).eq('id', oportunidadeId);
          await supabase.from('crm_oportunidade_historico').insert({ empresa_id: empresaId, oportunidade_id: oportunidadeId, acao: 'perdido', descricao: `Oportunidade PERDIDA. Motivo: ${motivo?.nome}`, created_at: new Date().toISOString() });
          showSuccess({ title: 'Sucesso', description: 'Oportunidade encerrada como perdida.' });
          onRefresh();
        } catch (e) {
          showError({ title: 'Erro', description: e.message });
        }
      },
    });
  };

  const salvarTarefa = async () => {
    if (!novaTarefa.titulo) {
      showError({ title: 'Informe o título da tarefa', description: '' });
      return;
    }
    try {
      await supabase.from('crm_tarefas').insert({ ...novaTarefa, empresa_id: empresaId, oportunidade_id: oportunidadeId, status: 'pendente', created_at: new Date().toISOString() });
      showSuccess({ title: 'Sucesso', description: 'Tarefa criada com sucesso.' });
      setNovaTarefa({ titulo: '', tipo: 'Ligação', data_execucao: '' });
      setShowTarefaForm(false);
      carregar();
    } catch (e) {
      showError({ title: 'Erro ao salvar tarefa', description: e.message });
    }
  };

  const concluirTarefa = async (tarefa) => {
    try {
      await supabase.from('crm_tarefas').update({ status: 'concluido', updated_at: new Date().toISOString() }).eq('id', tarefa.id);
      carregar();
    } catch (e) {
      showError({ title: 'Erro', description: e.message });
    }
  };

  const formatVal = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '—';
  const formatDate = d => d ? new Date(d).toLocaleString('pt-BR') : '—';

  const statusColor = s => ({ aberto: 'bg-blue-100 text-blue-700', ganho: 'bg-green-100 text-green-700', perdido: 'bg-red-100 text-red-700' }[s] || 'bg-slate-100 text-slate-600');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {loading ? 'Carregando...' : op?.titulo}
          </DialogTitle>
        </DialogHeader>

        {!loading && op && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(op.status)}`}>
                {op.status?.toUpperCase()}
              </span>
              {op.valor > 0 && <span className="text-sm font-semibold text-green-600">{formatVal(op.valor)}</span>}
              {op.cliente_nome && <span className="text-sm text-slate-500">{op.cliente_nome}</span>}
            </div>

            {/* Ações principais (só se aberto) */}
            {op.status === 'aberto' && (
              <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase">Ações</p>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-slate-500 mb-1 block">Motivo de perda</label>
                    <Select value={motivoSelecionado} onValueChange={setMotivoSelecionado}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {motivosPerda.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="destructive" size="sm" onClick={marcarPerda}>
                    <XCircle className="h-4 w-4 mr-1" /> Perdido
                  </Button>
                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={marcarGanho}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Ganho
                  </Button>
                </div>
              </div>
            )}

            {op.status === 'perdido' && op.motivo_perda_nome && (
              <p className="text-sm text-red-600">Motivo de perda: <strong>{op.motivo_perda_nome}</strong></p>
            )}

            <Tabs defaultValue="historico">
              <TabsList>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="tarefas">Tarefas ({tarefas.length})</TabsTrigger>
                <TabsTrigger value="dados">Dados</TabsTrigger>
              </TabsList>

              <TabsContent value="historico" className="space-y-2 mt-3">
                {historico.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sem histórico</p>}
                {historico.map(h => (
                  <div key={h.id} className="flex gap-3 text-sm border-l-2 border-slate-200 pl-3">
                    <div>
                      <p className="text-slate-700">{h.descricao}</p>
                      <p className="text-xs text-slate-400">{formatDate(h.created_at)}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="tarefas" className="space-y-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowTarefaForm(v => !v)}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
                </Button>
                {showTarefaForm && (
                  <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
                    <Input placeholder="Título da tarefa" value={novaTarefa.titulo} onChange={e => setNovaTarefa(p => ({ ...p, titulo: e.target.value }))} />
                    <Select value={novaTarefa.tipo} onValueChange={v => setNovaTarefa(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Ligação', 'E-mail', 'Reunião', 'Visita', 'Proposta'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="datetime-local" value={novaTarefa.data_execucao} onChange={e => setNovaTarefa(p => ({ ...p, data_execucao: e.target.value }))} />
                    <Button size="sm" onClick={salvarTarefa}>Salvar Tarefa</Button>
                  </div>
                )}
                {tarefas.map(t => (
                  <div key={t.id} className={`flex items-start justify-between p-3 rounded-lg border ${t.status === 'concluido' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                    <div>
                      <p className={`text-sm font-medium ${t.status === 'concluido' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.titulo}</p>
                      <p className="text-xs text-slate-400">{t.tipo} · {t.data_execucao ? new Date(t.data_execucao).toLocaleDateString('pt-BR') : '—'}</p>
                    </div>
                    {t.status !== 'concluido' && (
                      <Button variant="ghost" size="sm" onClick={() => concluirTarefa(t)}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="dados" className="space-y-2 mt-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-slate-400">Responsável</p><p className="font-medium">{op.responsavel_nome || '—'}</p></div>
                  <div><p className="text-xs text-slate-400">Criado em</p><p className="font-medium">{formatDate(op.created_at)}</p></div>
                  {op.observacoes && <div className="col-span-2"><p className="text-xs text-slate-400">Observações</p><p>{op.observacoes}</p></div>}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}