import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/lib/supabaseClient';
import { useEmpresa } from '@/components/context/EmpresaContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, AlertCircle } from 'lucide-react';
import { useGlobalAlert } from '@/components/GlobalAlertDialog';

export default function CategoriasTamanhoPage() {
  const { empresa_id } = useEmpresa();
  const { showAlert } = useGlobalAlert();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', ativo: true });

  // Fetch categorias
  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias_tamanho', empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const { data, error } = await supabase
        .from('categorias_tamanho')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!empresa_id,
  });

  // Create/Update
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        const { error } = await supabase
          .from('categorias_tamanho')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categorias_tamanho')
          .insert([{ ...payload, empresa_id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias_tamanho'] });
      setIsOpen(false);
      setEditingId(null);
      setFormData({ nome: '', descricao: '', ativo: true });
      showAlert('success', 'Sucesso', editingId ? 'Categoria atualizada!' : 'Categoria criada!');
    },
    onError: (error) => {
      showAlert('error', 'Erro', error.message);
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('categorias_tamanho').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias_tamanho'] });
      showAlert('success', 'Sucesso', 'Categoria deletada!');
    },
    onError: (error) => {
      showAlert('error', 'Erro', error.message);
    },
  });

  const handleOpen = (categoria = null) => {
    if (categoria) {
      setEditingId(categoria.id);
      setFormData({ nome: categoria.nome, descricao: categoria.descricao, ativo: categoria.ativo });
    } else {
      setEditingId(null);
      setFormData({ nome: '', descricao: '', ativo: true });
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) {
      showAlert('error', 'Erro', 'Nome é obrigatório');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias de Tamanho</h1>
          <p className="text-gray-600 mt-1">Gerenciar categorias de tamanho para produtos</p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : categorias.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhuma categoria criada ainda.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.nome}</TableCell>
                  <TableCell className="text-gray-600">{cat.descricao || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={cat.ativo ? 'default' : 'secondary'}>
                      {cat.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpen(cat)}
                      className="gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 gap-1"
                      onClick={() => deleteMutation.mutate(cat.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Adulto, Infantil, Plus Size"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Ativo</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}