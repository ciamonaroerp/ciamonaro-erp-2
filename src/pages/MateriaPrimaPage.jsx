import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { useEmpresa } from "@/components/context/EmpresaContext";

const TABLE = "materia_prima_importada";
async function mpList(empresa_id) {
  const { data } = await supabase.from(TABLE).select("*").eq("empresa_id", empresa_id).order("created_at", { ascending: false });
  return data || [];
}
async function mpCreate(empresa_id, item) {
  const { data } = await supabase.from(TABLE).insert({ ...item, empresa_id }).select().single();
  return data;
}
async function mpUpdate(id, payload) {
  const { data } = await supabase.from(TABLE).update(payload).eq("id", id).select().single();
  return data;
}
async function mpDelete(id) {
  await supabase.from(TABLE).delete().eq("id", id);
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Upload, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ErpTableContainer } from "@/components/design-system";

function parseXmlNFe(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const get = (tag) => doc.querySelector(tag)?.textContent?.trim() || "";
    const chave = get("chNFe") || get("Id")?.replace("NFe", "") || "";
    const numero = get("nNF");
    const cnpj = get("emit CNPJ");
    const fornecedor = get("emit xNome") || get("emit xFant");
    const dets = doc.querySelectorAll("det");
    const itens = Array.from(dets).map(det => ({
      codigo_produto: det.querySelector("cProd")?.textContent?.trim() || "",
      descricao_produto: det.querySelector("xProd")?.textContent?.trim() || "",
      unidade: det.querySelector("uCom")?.textContent?.trim() || "",
      quantidade: parseFloat(det.querySelector("qCom")?.textContent || "0"),
      valor_unitario: parseFloat(det.querySelector("vUnCom")?.textContent || "0"),
      valor_total: parseFloat(det.querySelector("vProd")?.textContent || "0"),
      chave_nfe: chave,
      numero_nf: numero,
      fornecedor_cnpj: cnpj,
      fornecedor_nome: fornecedor,
    }));
    return { ok: true, chave, numero, cnpj, fornecedor, itens };
  } catch {
    return { ok: false, itens: [] };
  }
}

export default function MateriaPrimaPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [chaveManual, setChaveManual] = useState("");
  const [xmlText, setXmlText] = useState("");
  const [parsedItens, setParsedItens] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [editingId, setEditingId] = useState(null);

  const { data: materias = [] } = useQuery({
    queryKey: ["materia-prima", empresa_id],
    queryFn: () => mpList(empresa_id),
    enabled: !!empresa_id,
  });

  const filtered = useMemo(() => {
    if (!searchTerm) return materias;
    const t = searchTerm.toLowerCase();
    return materias.filter(m =>
      m.descricao_produto?.toLowerCase().includes(t) ||
      m.codigo_produto?.toLowerCase().includes(t) ||
      m.fornecedor_nome?.toLowerCase().includes(t)
    );
  }, [materias, searchTerm]);

  const importarMutation = useMutation({
    mutationFn: (itens) => Promise.all(itens.map(it => mpCreate(empresa_id, it))),
    onSuccess: () => { qc.invalidateQueries(["materia-prima"]); setConfirmDialog(false); setImportDialog(false); setParsedItens(null); setChaveManual(""); setXmlText(""); },
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }) => mpUpdate(id, data),
    onSuccess: () => { qc.invalidateQueries(["materia-prima"]); setEditModal(false); },
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => mpDelete(id),
    onSuccess: () => { qc.invalidateQueries(["materia-prima"]); setDeleteTarget(null); },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setXmlText(text);
      const result = parseXmlNFe(text);
      if (result.ok && result.itens.length > 0) {
        setParsedItens(result);
      } else {
        alert("Não foi possível ler os itens do XML. Verifique o arquivo.");
      }
    };
    reader.readAsText(file);
  };

  const handleChaveManual = () => {
    const chave = chaveManual.replace(/\D/g, "");
    if (chave.length !== 44) {
      alert("A chave DANFE deve ter 44 dígitos numéricos.");
      return;
    }
    setParsedItens({
      ok: true,
      chave,
      numero: "",
      cnpj: "",
      fornecedor: "",
      itens: [{
        codigo_produto: "MANUAL",
        descricao_produto: `Item via chave ${chave.slice(0, 8)}...`,
        unidade: "UN",
        quantidade: 0,
        valor_unitario: 0,
        valor_total: 0,
        chave_nfe: chave,
        numero_nf: "",
        fornecedor_cnpj: "",
        fornecedor_nome: "",
      }],
    });
  };

  const handleEdit = (row) => {
    setEditData(row);
    setEditingId(row.id);
    setEditModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Matéria Prima</h1>
          <p className="text-sm text-slate-500 mt-0.5">{materias.length} item(ns) importado(s)</p>
        </div>
        <Button onClick={() => setImportDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Importar NF-e
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Input
          className="pl-9"
          placeholder="Buscar por descrição, código ou fornecedor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
      </div>

      <ErpTableContainer>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Código</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Descrição</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Fornecedor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Unidade</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Qtd</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Chave NF-e</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum item importado ainda.</td></tr>
            )}
            {filtered.map(m => (
              <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.codigo_produto}</td>
                <td className="px-4 py-3 font-medium">{m.descricao_produto}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{m.fornecedor_nome || "-"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{m.unidade || "-"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{m.quantidade ?? "-"}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[180px]" title={m.chave_nfe}>{m.chave_nfe ? m.chave_nfe.slice(0, 20) + "…" : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleEdit(m)} className="p-1.5 hover:bg-amber-100 rounded transition-colors text-amber-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteTarget(m)} className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ErpTableContainer>

      {/* Modal de Importação */}
      <Dialog open={importDialog} onOpenChange={() => { setImportDialog(false); setParsedItens(null); setChaveManual(""); setXmlText(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar NF-e — Matéria Prima</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Upload XML */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Upload className="h-4 w-4" /> Upload de XML</p>
              <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <input type="file" accept=".xml" className="hidden" onChange={handleFileUpload} />
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Clique para selecionar o arquivo XML da NF-e</p>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Chave Manual */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Chave DANFE (44 dígitos)</p>
              <div className="flex gap-2">
                <Input
                  value={chaveManual}
                  onChange={e => setChaveManual(e.target.value.replace(/\D/g, "").slice(0, 44))}
                  placeholder="00000000000000000000000000000000000000000000"
                  className="font-mono text-xs"
                />
                <Button onClick={handleChaveManual} variant="outline">Ler</Button>
              </div>
            </div>

            {/* Itens encontrados */}
            {parsedItens && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">Itens encontrados: {parsedItens.itens.length}</p>
                  {parsedItens.fornecedor && <p className="text-xs text-slate-500">Fornecedor: {parsedItens.fornecedor} — NF nº {parsedItens.numero}</p>}
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {parsedItens.itens.map((it, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{it.descricao_produto}</p>
                        <p className="text-xs text-slate-500">Cód: {it.codigo_produto} · {it.quantidade} {it.unidade}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">R$ {it.valor_total?.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => { setImportDialog(false); setParsedItens(null); setChaveManual(""); setXmlText(""); }}>Cancelar</Button>
            {parsedItens && (
              <Button onClick={() => setConfirmDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                Confirmar Importação
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Importação */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja importar <strong>{parsedItens?.itens?.length}</strong> item(ns) desta NF-e? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel onClick={() => setConfirmDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importarMutation.mutate(parsedItens.itens)}
              disabled={importarMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {importarMutation.isPending ? "Importando..." : "Confirmar Importação"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Edição */}
      <Dialog open={editModal} onOpenChange={() => setEditModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Código do Produto</label>
              <Input value={editData.codigo_produto || ""} onChange={e => setEditData(p => ({ ...p, codigo_produto: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Descrição *</label>
              <Input value={editData.descricao_produto || ""} onChange={e => setEditData(p => ({ ...p, descricao_produto: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Unidade</label>
                <Input value={editData.unidade || ""} onChange={e => setEditData(p => ({ ...p, unidade: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-1">Quantidade</label>
                <Input type="number" value={editData.quantidade || ""} onChange={e => setEditData(p => ({ ...p, quantidade: parseFloat(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-1">Fornecedor</label>
              <Input value={editData.fornecedor_nome || ""} onChange={e => setEditData(p => ({ ...p, fornecedor_nome: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button onClick={() => editarMutation.mutate({ id: editingId, data: editData })} disabled={editarMutation.isPending} className="bg-blue-600 hover:bg-blue-700">Atualizar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir Item</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{deleteTarget?.descricao_produto}</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletarMutation.mutate(deleteTarget.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}