import { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

export default function CRMConfigModal({ empresaId, funil, onClose }) {
  const { showError, showSuccess, showConfirm } = useGlobalAlert();
  const [motivosPerda, setMotivosPerda] = useState([]);
  const [motivosGanho, setMotivosGanho] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [novoPerda, setNovoPerda] = useState('');
  const [novoGanho, setNovoGanho] = useState('');
  const [novaEtapa, setNovaEtapa] = useState({ nome: '', percentual: '' });
  const [editandoEtapa, setEditandoEtapa] = useState(null);
  const [editandoMotivo, setEditandoMotivo] = useState(null); // { id, nome, tabela }

  const carregar = async () => {
    if (!supabase) return;
    try {
      const [{ data: perda }, { data: ganho }, { data: etapasData }] = await Promise.all([
        supabase.from('crm_motivos_perda').select('id,nome').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('crm_motivos_ganho').select('id,nome').eq('empresa_id', empresaId).is('deleted_at', null),
        supabase.from('crm_etapas').select('id,nome,ordem,percentual').eq('empresa_id', empresaId).is('deleted_at', null).order('ordem'),
      ]);
      setMotivosPerda(perda || []);
      setMotivosGanho(ganho || []);
      setEtapas((etapasData || []).sort((a, b) => a.ordem - b.ordem));
    } catch (e) {
      showError({ title: 'Erro', description: e.message });
    }
  };

  useEffect(() => { carregar(); }, []);

  const adicionarMotivo = async (tabela, nome, reset) => {
    if (!nome.trim() || !supabase) return;
    try {
      await supabase.from(tabela).insert({ empresa_id: empresaId, nome: nome.trim() });
      reset('');
      carregar();
      showSuccess({ title: 'Sucesso', description: 'Motivo adicionado.' });
    } catch (e) {
      showError({ title: 'Erro', description: e.message });
    }
  };

  const excluirItem = (tabela, id) => {
    showConfirm({
      title: 'Deseja excluir este registro?',
      description: 'Esta ação não poderá ser desfeita.',
      onConfirm: async () => {
        try {
          await supabase.from(tabela).update({ deleted_at: new Date().toISOString() }).eq('id', id);
          carregar();
        } catch (e) {
          showError({ title: 'Erro', description: e.message });
        }
      },
    });
  };

  const salvarEdicaoMotivo = async () => {
    if (!editandoMotivo?.nome?.trim() || !supabase) return;
    try {
      await supabase.from(editandoMotivo.tabela).update({ nome: editandoMotivo.nome.trim() }).eq('id', editandoMotivo.id);
      setEditandoMotivo(null);
      carregar();
    } catch (e) {
      showError({ title: 'Erro', description: e.message });
    }
  };

  const salvarEdicaoEtapa = async () => {
    if (!editandoEtapa?.nome?.trim() || !supabase) return;
    try {
      await supabase.from('crm_etapas').update({ nome: editandoEtapa.nome.trim(), percentual: parseInt(editandoEtapa.percentual) || 0 }).eq('id', editandoEtapa.id);
      setEditandoEtapa(null);
      carregar();
    } catch (e) {
      showError({ title: 'Erro', description: e.message });
    }
  };

  const adicionarEtapa = async () => {
    if (!novaEtapa.nome.trim() || !supabase) {
      showError({ title: 'Informe o nome da etapa', description: '' });
      return;
    }
    let funilId = funil?.id;
    if (!funilId) {
      try {
        const { data: novoFunil, error } = await supabase.from('crm_funis').insert({ nome: 'Funil Principal' }).select().single();
        if (error || !novoFunil?.id) {
          showError({ title: 'Erro', description: 'Não foi possível criar o funil automaticamente.' });
          return;
        }
        funilId = novoFunil.id;
      } catch (e) {
        showError({ title: 'Erro ao criar funil', description: e.message });
        return;
      }
    }
    const proximaOrdem = etapas.length > 0 ? Math.max(...etapas.map(e => e.ordem)) + 1 : 1;
    try {
      await supabase.from('crm_etapas').insert({ empresa_id: empresaId, funil_id: funilId, nome: novaEtapa.nome.trim(), ordem: proximaOrdem, percentual: parseInt(novaEtapa.percentual) || 0 });
      setNovaEtapa({ nome: '', percentual: '' });
      carregar();
      showSuccess({ title: 'Sucesso', description: 'Etapa adicionada.' });
    } catch (e) {
      showError({ title: 'Erro', description: e.message });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações do CRM</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="etapas">
          <TabsList className="w-full">
            <TabsTrigger value="etapas" className="flex-1">Etapas</TabsTrigger>
            <TabsTrigger value="perda" className="flex-1">Motivos de Perda</TabsTrigger>
            <TabsTrigger value="ganho" className="flex-1">Motivos de Ganho</TabsTrigger>
          </TabsList>

          <TabsContent value="etapas" className="mt-4 space-y-3">
            <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nome da etapa</label>
                <Input placeholder="Ex: Prospecção" value={novaEtapa.nome} onChange={e => setNovaEtapa(p => ({ ...p, nome: e.target.value }))} onKeyDown={e => e.key === 'Enter' && adicionarEtapa()} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">% chance</label>
                <Input type="number" min="0" max="100" placeholder="0" value={novaEtapa.percentual} onChange={e => setNovaEtapa(p => ({ ...p, percentual: e.target.value }))} />
              </div>
              <Button onClick={adicionarEtapa} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {etapas.map(etapa => (
                <div key={etapa.id} className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50">
                  {editandoEtapa?.id === etapa.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        className="h-7 text-sm"
                        value={editandoEtapa.nome}
                        onChange={e => setEditandoEtapa(p => ({ ...p, nome: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && salvarEdicaoEtapa()}
                        autoFocus
                      />
                      <Input
                        type="number" min="0" max="100"
                        className="h-7 text-sm w-20"
                        value={editandoEtapa.percentual}
                        onChange={e => setEditandoEtapa(p => ({ ...p, percentual: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && salvarEdicaoEtapa()}
                      />
                      <button onClick={salvarEdicaoEtapa} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditandoEtapa(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-400 w-5 text-right">{etapa.ordem}</span>
                        <span className="text-sm font-medium">{etapa.nome}</span>
                        <span className="text-xs text-slate-400">{etapa.percentual}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditandoEtapa({ id: etapa.id, nome: etapa.nome, percentual: etapa.percentual })}>
                          <Pencil className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => excluirItem('crm_etapas', etapa.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {etapas.length === 0 && <p className="text-sm text-slate-400 text-center py-3">Nenhuma etapa cadastrada</p>}
            </div>
          </TabsContent>

          <TabsContent value="perda" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Novo motivo..." value={novoPerda} onChange={e => setNovoPerda(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarMotivo('crm_motivos_perda', novoPerda, setNovoPerda)} />
              <Button onClick={() => adicionarMotivo('crm_motivos_perda', novoPerda, setNovoPerda)} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-1">
              {motivosPerda.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50">
                  {editandoMotivo?.id === m.id && editandoMotivo?.tabela === 'crm_motivos_perda' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input className="h-7 text-sm" value={editandoMotivo.nome} onChange={e => setEditandoMotivo(p => ({ ...p, nome: e.target.value }))} onKeyDown={e => e.key === 'Enter' && salvarEdicaoMotivo()} autoFocus />
                      <button onClick={salvarEdicaoMotivo} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditandoMotivo(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm">{m.nome}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditandoMotivo({ id: m.id, nome: m.nome, tabela: 'crm_motivos_perda' })}><Pencil className="h-3.5 w-3.5 text-blue-500" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => excluirItem('crm_motivos_perda', m.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {motivosPerda.length === 0 && <p className="text-sm text-slate-400 text-center py-3">Nenhum motivo cadastrado</p>}
            </div>
          </TabsContent>
          <TabsContent value="ganho" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Novo motivo..." value={novoGanho} onChange={e => setNovoGanho(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarMotivo('crm_motivos_ganho', novoGanho, setNovoGanho)} />
              <Button onClick={() => adicionarMotivo('crm_motivos_ganho', novoGanho, setNovoGanho)} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-1">
              {motivosGanho.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50">
                  {editandoMotivo?.id === m.id && editandoMotivo?.tabela === 'crm_motivos_ganho' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input className="h-7 text-sm" value={editandoMotivo.nome} onChange={e => setEditandoMotivo(p => ({ ...p, nome: e.target.value }))} onKeyDown={e => e.key === 'Enter' && salvarEdicaoMotivo()} autoFocus />
                      <button onClick={salvarEdicaoMotivo} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditandoMotivo(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm">{m.nome}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditandoMotivo({ id: m.id, nome: m.nome, tabela: 'crm_motivos_ganho' })}><Pencil className="h-3.5 w-3.5 text-blue-500" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => excluirItem('crm_motivos_ganho', m.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {motivosGanho.length === 0 && <p className="text-sm text-slate-400 text-center py-3">Nenhum motivo cadastrado</p>}
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}