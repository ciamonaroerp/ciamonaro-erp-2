import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Trash2, Plus } from "lucide-react";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import { supabase } from "@/components/lib/supabaseClient";

export default function InformacaoComplementar() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ titulo: "", descricao: "" });
  const { showSuccess, showError, showConfirm } = useGlobalAlert();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("informacoes_complementares").select("*").is("deleted_at", null);
      if (error) throw new Error(error.message);
      setItems(data || []);
    } catch (err) {
      showError({ title: "Erro", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.titulo.trim() || !formData.descricao.trim()) {
      showError({
        title: "Validação",
        description: "Título e texto são obrigatórios",
      });
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase.from("informacoes_complementares").update({ titulo: formData.titulo, descricao: formData.descricao }).eq("id", editing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("informacoes_complementares").insert({ titulo: formData.titulo, descricao: formData.descricao });
        if (error) throw new Error(error.message);
      }

      showSuccess({
        title: "Informação salva",
        description: "Cadastro realizado com sucesso",
      });
      setFormData({ titulo: "", descricao: "" });
      setEditing(null);
      setShowForm(false);
      await loadItems();
    } catch (err) {
      showError({ title: "Erro", description: err.message });
    }
  };

  const handleEdit = (item) => {
    setFormData({ titulo: item.titulo, descricao: item.descricao });
    setEditing(item);
    setShowForm(true);
  };

  const handleDelete = (item) => {
    showConfirm({
      title: "Deseja excluir esta informação?",
      description: "Esta ação não poderá ser desfeita.",
      onConfirm: async () => {
        try {
          await supabase.from("informacoes_complementares").update({ deleted_at: new Date().toISOString() }).eq("id", item.id);
          showSuccess({
            title: "Informação deletada",
            description: "Cadastro removido com sucesso",
          });
          await loadItems();
        } catch (err) {
          showError({ title: "Erro", description: err.message });
        }
      },
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({ titulo: "", descricao: "" });
    setEditing(null);
  };

  if (loading) {
    return <div className="text-center text-slate-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Nova informação
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nenhuma informação cadastrada
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{item.titulo}</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap mt-2">
                    {item.descricao}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item)}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar informação" : "Nova informação"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Título *
              </label>
              <Input
                placeholder="Digite o título"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Texto *
              </label>
              <Textarea
                placeholder="Digite o texto (múltiplas linhas)"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                className="w-full min-h-[200px] resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}