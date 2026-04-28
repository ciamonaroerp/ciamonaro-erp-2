import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useSupabaseAuth } from '@/components/context/SupabaseAuthContext';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, AlertCircle, CalendarDays, Plus, X, RefreshCw, Pencil } from 'lucide-react';
import CRMEditarTarefaModal from '@/components/crm/CRMEditarTarefaModal';

// Usa data local do navegador para evitar problemas de fuso horário
const localDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const getDatePart = d => d ? d.substring(0, 10) : null;
const isPast = d => { const dp = getDatePart(d); return dp && dp < localDateStr(); };
const isToday = d => { const dp = getDatePart(d); return dp && dp === localDateStr(); };
const isFuture = d => { const dp = getDatePart(d); return dp && dp > localDateStr(); };
const formatDate = d => d ? new Date(d.substring(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

function TarefaCard({ tarefa, onConcluir, onEditar }) {
  const atrasada = isPast(tarefa.data_execucao);
  const ehHoje = isToday(tarefa.data_execucao);
  const concluida = tarefa.status === 'concluida';

  return (
    <div className={`flex items-start justify-between p-4 rounded-xl border transition-all
      ${concluida ? 'bg-slate-50 border-slate-200 opacity-60' :
        atrasada ? 'bg-red-50 border-red-200' :
        ehHoje ? 'bg-amber-50 border-amber-200' :
        'bg-white border-slate-200 hover:shadow-sm'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer
          ${concluida ? 'bg-green-500 border-green-500' :
            atrasada ? 'border-red-400 hover:bg-red-100' :
            ehHoje ? 'border-amber-400 hover:bg-amber-100' :
            'border-slate-300 hover:bg-blue-50'}`}
          onClick={!concluida ? () => onConcluir(tarefa) : undefined}
        >
          {concluida && <CheckCircle2 className="h-3 w-3 text-white" />}
        </div>
        <div>
          <p className={`text-sm font-medium ${concluida ? 'line-through text-slate-400' : atrasada ? 'text-red-800' : 'text-slate-800'}`}>
            {tarefa.titulo}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(tarefa.data_execucao)}
            {tarefa.tipo && <span className="ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{tarefa.tipo}</span>}
          </p>
        </div>
      </div>
      {!concluida && (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEditar(tarefa)} title="Editar tarefa" className="shrink-0">
            <Pencil className="h-4 w-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onConcluir(tarefa)} title="Concluir tarefa" className="shrink-0">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Bloco({ icon: Icon, iconColor, bgColor, titulo, badge, badgeBg, tarefas, onConcluir, onEditar, emptyMsg }) {
  if (tarefas.length === 0) return null;
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${bgColor}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{titulo}</h2>
        <span className={`text-xs text-white px-2 py-0.5 rounded-full font-bold ${badgeBg}`}>{tarefas.length}</span>
      </div>
      <div className="space-y-2">
        {tarefas.map(t => <TarefaCard key={t.id} tarefa={t} onConcluir={onConcluir} onEditar={onEditar} />)}
      </div>
    </div>
  );
}

export default function CRMTarefasPage() {
  const { showSuccess, showError } = useGlobalAlert();
  const { erpUsuario } = useSupabaseAuth();
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: '', data_execucao: '', tipo: 'Ligação', oportunidade_id: '' });
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState('pendentes');
  const [tarefaEditando, setTarefaEditando] = useState(null);

  const carregarTarefas = useCallback(async () => {
    if (!erpUsuario?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('crm_tarefas').select('id,titulo,data_execucao,status,tipo,oportunidade_id').eq('responsavel_id', erpUsuario.id).order('data_execucao').limit(100);
      setTarefas(data || []);
    } catch (e) {
      showError({ title: 'Erro ao carregar tarefas', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [erpUsuario?.id]);

  useEffect(() => { carregarTarefas(); }, [erpUsuario?.id]);

  const concluirTarefa = async (tarefa) => {
    try {
      await supabase.from('crm_tarefas').update({ status: 'concluida', updated_at: new Date().toISOString() }).eq('id', tarefa.id);
      showSuccess({ title: 'Tarefa concluída!', description: tarefa.titulo });
      carregarTarefas();
    } catch (e) {
      showError({ title: 'Erro ao concluir tarefa', description: e.message });
    }
  };

  const salvarTarefa = async () => {
    if (!form.titulo.trim()) {
      showError({ title: 'Título obrigatório', description: 'Informe o título da tarefa' });
      return;
    }
    if (!form.data_execucao) {
      showError({ title: 'Data obrigatória', description: 'Informe a data de execução' });
      return;
    }
    if (!erpUsuario?.id) {
      showError({ title: 'Usuário não identificado', description: 'Faça login novamente' });
      return;
    }
    setSaving(true);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const opId = form.oportunidade_id && uuidRegex.test(form.oportunidade_id) ? form.oportunidade_id : null;
      await supabase.from('crm_tarefas').insert({ titulo: form.titulo.trim(), data_execucao: form.data_execucao, tipo: form.tipo, oportunidade_id: opId, responsavel_id: erpUsuario.id, status: 'pendente' });
      showSuccess({ title: 'Tarefa criada!', description: form.titulo });
      setForm({ titulo: '', data_execucao: '', tipo: 'Ligação', oportunidade_id: '' });
      setShowForm(false);
      carregarTarefas();
    } catch (e) {
      showError({ title: 'Erro ao criar tarefa', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const pendentes = tarefas.filter(t => t.status !== 'concluida');
  const concluidas = tarefas.filter(t => t.status === 'concluida');
  const atrasadas = pendentes.filter(t => isPast(t.data_execucao));
  const deHoje = pendentes.filter(t => isToday(t.data_execucao));
  const futuras = pendentes.filter(t => isFuture(t.data_execucao) || !t.data_execucao);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tarefas CRM</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {atrasadas.length > 0 && <span className="text-red-600 font-semibold">{atrasadas.length} atrasada{atrasadas.length > 1 ? 's' : ''} · </span>}
            {deHoje.length} para hoje · {futuras.length} futuras
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={carregarTarefas} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowForm(v => !v)} style={showForm ? {} : { background: '#3B5CCC' }} className={showForm ? 'gap-2' : 'text-white gap-2'}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nova Tarefa'}
          </Button>
        </div>
      </div>

      {/* Formulário nova tarefa */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Nova tarefa</h3>
          <Input
            placeholder="Título da tarefa *"
            value={form.titulo}
            onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Data de execução *</label>
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
                  {['Ligação', 'E-mail', 'Reunião', 'Visita', 'Proposta', 'WhatsApp'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={salvarTarefa} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Criar Tarefa'}
          </Button>
        </div>
      )}

      {tarefaEditando && (
        <CRMEditarTarefaModal
          tarefa={tarefaEditando}
          onClose={() => setTarefaEditando(null)}
          onSaved={carregarTarefas}
        />
      )}

      {/* Filtros */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtro === 'pendentes' ? (
        <div className="space-y-4">
          <Bloco icon={AlertCircle} iconColor="text-red-600" bgColor="border-red-100 bg-red-50/30"
            titulo="Atrasadas" badge={atrasadas.length} badgeBg="bg-red-500"
            tarefas={atrasadas} onConcluir={concluirTarefa} onEditar={setTarefaEditando} />
          <Bloco icon={Clock} iconColor="text-amber-600" bgColor="border-amber-100 bg-amber-50/30"
            titulo="Hoje" badge={deHoje.length} badgeBg="bg-amber-500"
            tarefas={deHoje} onConcluir={concluirTarefa} onEditar={setTarefaEditando} />
          <Bloco icon={CalendarDays} iconColor="text-blue-600" bgColor="border-blue-100 bg-blue-50/30"
            titulo="Futuras" badge={futuras.length} badgeBg="bg-blue-500"
            tarefas={futuras} onConcluir={concluirTarefa} onEditar={setTarefaEditando} />
          {pendentes.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-300" />
              <p className="text-sm font-medium">Nenhuma tarefa pendente — tudo em dia!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {concluidas.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">Nenhuma tarefa concluída ainda.</p>
          ) : concluidas.map(t => <TarefaCard key={t.id} tarefa={t} onConcluir={concluirTarefa} onEditar={setTarefaEditando} />)}
        </div>
      )}
    </div>
  );
}