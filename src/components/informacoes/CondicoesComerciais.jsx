import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { supabase } from "@/components/lib/supabaseClient";
import { useGlobalAlert } from "@/components/GlobalAlertDialog";

const TABLE = "informacoes_condicoes_comerciais";

export default function CondicoesComerciais() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const { showConfirm, showError, showSuccess } = useGlobalAlert();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("informacoes_condicoes_comerciais").select("*").is("deleted_at", null).order("sequencia", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newText.trim()) return;
    setSaving(true);
    const seq = (items.length > 0 ? Math.max(...items.map(i => i.sequencia || 0)) : 0) + 1;
    const { error } = await supabase.from("informacoes_condicoes_comerciais").insert({ descricao: newText.trim(), sequencia: seq });
    if (error) { showError({ title: "Erro", description: error.message }); }
    else { showSuccess({ title: "Condição salva", description: "Cadastro realizado com sucesso." }); setNewText(""); setShowForm(false); await load(); }
    setSaving(false);
  }

  async function handleEdit(item) {
    if (!editingText.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("informacoes_condicoes_comerciais").update({ descricao: editingText.trim() }).eq("id", item.id);
    if (error) { showError({ title: "Erro", description: error.message }); }
    else { showSuccess({ title: "Condição atualizada", description: "Alteração salva com sucesso." }); setEditingId(null); await load(); }
    setSaving(false);
  }

  async function handleDelete(item) {
    showConfirm({
      title: "Deseja excluir esta condição?",
      description: "Esta ação não poderá ser desfeita.",
      onConfirm: async () => {
        try {
          await supabase.from("informacoes_condicoes_comerciais").update({ deleted_at: new Date().toISOString() }).eq("id", item.id);
          await load();
          showSuccess({ title: "Condição removida", description: "Exclusão realizada com sucesso." });
        } catch (err) {
          showError({ title: "Erro", description: err.message || "Não foi possível excluir." });
        }
      },
    });
  }

  const fmtSeq = (n) => String(n).padStart(2, "0");

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-600">{items.length} condição(ões) cadastrada(s)</span>
        <Button
          size="sm"
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => { setShowForm(true); setNewText(""); }}
        >
          <Plus className="h-4 w-4" />
          Nova condição comercial
        </Button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <span className="text-sm font-mono text-slate-400 w-8">{fmtSeq(items.length + 1)}</span>
          <Input
            autoFocus
            placeholder="Descreva a condição comercial..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowForm(false); }}
            className="flex-1"
          />
          <Button size="sm" onClick={handleCreate} disabled={saving || !newText.trim()} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Check className="h-4 w-4" /> Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="px-6 py-12 text-center text-sm text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-400">
          Nenhuma condição comercial cadastrada.
        </div>
      ) : (
        <ul>
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-center gap-4 px-6 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-mono text-slate-400 w-8 shrink-0">{fmtSeq(item.sequencia)}</span>

              {editingId === item.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleEdit(item); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1"
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} disabled={saving}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4 text-slate-400" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-800">{item.descricao}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingId(item.id); setEditingText(item.descricao); }}
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}