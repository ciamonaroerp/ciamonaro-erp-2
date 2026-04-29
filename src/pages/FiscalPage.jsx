import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { supabase } from "@/components/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, FileText, Eye, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ErpTableContainer } from "@/components/design-system";

import { useGlobalAlert } from "@/components/GlobalAlertDialog";
import NFePreview from "@/components/fiscal/NFePreview";
import { parseXmlNFe } from "@/components/fiscal/parseXmlNFe";
import { normalizeCNPJ } from "@/utils/cnpj";

export default function FiscalPage() {
  const { empresa_id } = useEmpresa();
  const qc = useQueryClient();
  const { showAlert } = useGlobalAlert();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [chaveManual, setChaveManual] = useState("");
  const [parsedNFe, setParsedNFe] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [validating, setValidating] = useState(false);

  const { data: notas = [] } = useQuery({
    queryKey: ["notas-fiscais", empresa_id],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("nota_fiscal_importada")
        .select("*")
        .eq("empresa_id", empresa_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!empresa_id,
  });

  const filtered = useMemo(() => {
    if (!searchTerm) return notas;
    const t = searchTerm.toLowerCase();
    return notas.filter(n =>
      n.numero_nf?.toLowerCase().includes(t) ||
      n.emitente_nome?.toLowerCase().includes(t) ||
      n.chave_nfe?.includes(t)
    );
  }, [notas, searchTerm]);

  const importarMutation = useMutation({
    mutationFn: async (nfe) => {
      if (!supabase) throw new Error("Supabase não inicializado.");
      const { data, error } = await supabase
        .from("nota_fiscal_importada")
        .insert({
          empresa_id,
          chave_nfe: nfe.chave,
          numero_nf: nfe.numero,
          serie: nfe.serie,
          data_emissao: nfe.data_emissao,
          data_entrada_saida: nfe.data_entrada_saida,
          valor_total_nf: nfe.valor_total,
          emitente_cnpj: nfe.emitente_cnpj,
          emitente_nome: nfe.emitente_nome,
          emitente_endereco: nfe.emitente_endereco,
          destinatario_documento: nfe.destinatario_documento,
          destinatario_nome: nfe.destinatario_nome,
          destinatario_endereco: nfe.destinatario_endereco,
          itens: nfe.itens,
          duplicatas: nfe.duplicatas,
          impostos: nfe.impostos,
          status: "Importada",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { savedNota: data, nfe };
    },
    onSuccess: async ({ savedNota, nfe }) => {
      // Registrar histórico de preços — usa itens do backend (com codigo_unico resolvido)
      const itensParaHistorico = savedNota?.itens
        ? (typeof savedNota.itens === 'string' ? JSON.parse(savedNota.itens) : savedNota.itens)
        : nfe?.itens;

      if (empresa_id && Array.isArray(itensParaHistorico) && itensParaHistorico.length > 0) {
        try {
          const contexto = {
            empresa_id,
            chave_danfe: nfe.chave,
            fornecedor: nfe.emitente_nome || null,
            numero_nf: nfe.numero || null,
            data_emissao: nfe.data_emissao || null,
          };
          await Promise.allSettled(
            itensParaHistorico.map((item, idx) =>
              supabase.from('historico_precos').insert({
                empresa_id: contexto.empresa_id,
                codigo_unico: item.codigo_unico || null,
                codigo_produto: item.codigo_produto || item.codigo || null,
                chave_danfe: contexto.chave_danfe || null,
                valor_unitario: item.valor_unitario || null,
                quantidade: item.quantidade || null,
                data_emissao: contexto.data_emissao || null,
                fornecedor: contexto.fornecedor || null,
                numero_nf: contexto.numero_nf || null,
                numero_item: idx + 1,
              })
            )
          );
        } catch (e) {
          console.error('Erro ao registrar histórico de preços:', e);
        }
      }

      // Sempre tenta gerar entradas — a função ignora itens sem codigo_unico
      let estoqueResult = null;
      if (empresa_id) {
        try {
          // Gera entradas de estoque para itens vinculados
          const itens = savedNota?.itens
            ? (typeof savedNota.itens === 'string' ? JSON.parse(savedNota.itens) : savedNota.itens)
            : [];
          let geradas = 0, pendentes = 0;
          for (const item of itens) {
            if (item.codigo_unico) {
              await supabase.from('estoque_movimentacoes').insert({
                empresa_id,
                nota_fiscal_id: savedNota?.id,
                codigo_unico: item.codigo_unico,
                tipo: 'entrada',
                quantidade: item.quantidade || 0,
                valor_unitario: item.valor_unitario || 0,
              });
              geradas++;
            } else {
              pendentes++;
            }
          }
          estoqueResult = { geradas, pendentes };
        } catch (e) {
          console.error("Erro ao gerar entradas de estoque:", e);
        }
      }
      qc.invalidateQueries(["notas-fiscais"]);
      qc.invalidateQueries(["estoque_saldo_atual"]);
      qc.invalidateQueries(["estoque_movimentacoes"]);
      setConfirmDialog(false);
      setImportDialog(false);
      setParsedNFe(null);
      setChaveManual("");

      // Monta alerta com resumo de entradas
      const geradas = estoqueResult?.geradas ?? 0;
      const pendentes = estoqueResult?.pendentes ?? 0;
      let alertTitle, alertDesc, alertType;

      if (pendentes === 0 && geradas > 0) {
        alertTitle = "NF-e importada com sucesso!";
        alertDesc = `✅ ${geradas} entrada(s) de estoque gerada(s) automaticamente.`;
        alertType = "success";
      } else if (pendentes > 0 && geradas > 0) {
        alertTitle = "NF-e importada — atenção necessária";
        alertDesc = `✅ ${geradas} entrada(s) gerada(s) automaticamente.\n⚠️ ${pendentes} item(s) precisam de vínculo manual em Configuração Tecido > Vínculos.`;
        alertType = "confirm";
      } else if (pendentes > 0 && geradas === 0) {
        alertTitle = "NF-e importada — vínculos pendentes";
        alertDesc = `⚠️ Nenhuma entrada foi gerada automaticamente.\n${pendentes} item(s) precisam de vínculo manual em Configuração Tecido > Vínculos.`;
        alertType = "error";
      } else {
        alertTitle = "NF-e importada com sucesso!";
        alertDesc = "Nenhum item novo para processar (já importados anteriormente).";
        alertType = "success";
      }

      showAlert({ type: alertType, title: alertTitle, description: alertDesc, confirmLabel: "Fechar", cancelLabel: null, onConfirm: null });
    },
    onError: (err) => {
      console.error("[fiscalCRUD] Erro ao importar:", err);
      const desc = err?.response?.data?.error || err.message;
      const isDuplicate = desc?.includes("duplicate key") || desc?.includes("unique_chave_nfe");
      if (isDuplicate) {
        showAlert({
          type: "confirm",
          title: "Arquivo já importado anteriormente",
          description: "Esta NF-e já existe no sistema.",
          confirmLabel: "Fechar",
          cancelLabel: null,
          onConfirm: null,
        });
      } else {
        showAlert({ type: "error", title: "Erro ao importar NF-e", description: desc, confirmLabel: "Fechar", cancelLabel: null, onConfirm: null });
      }
    },
  });

  const deletarMutation = useMutation({
    mutationFn: async (id) => {
      if (!supabase) throw new Error("Supabase não inicializado.");
      const { error } = await supabase
        .from("nota_fiscal_importada")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries(["notas-fiscais"]);
      setDeleteTarget(null);
    },
  });

  // Valida empresa (destinatário) e fornecedor (emitente) antes de permitir importação
  const validarEImportar = async (nfe) => {
    if (!nfe) return;
    const nfeNorm = {
      ...nfe,
      emitente_cnpj: normalizeCNPJ(nfe.emitente_cnpj),
      destinatario_documento: normalizeCNPJ(nfe.destinatario_documento),
    };
    setValidating(true);
    try {
      // Valida empresa e fornecedor diretamente no Supabase
      const [{ data: empresaData }, { data: fornecedorData }] = await Promise.all([
        supabase.from("empresas").select("id").eq("cnpj", nfeNorm.destinatario_documento).maybeSingle(),
        supabase.from("fornecedores").select("id").eq("documento", nfeNorm.emitente_cnpj).maybeSingle(),
      ]);
      const empresaOk = !!empresaData;
      const fornecedorOk = !!fornecedorData;

      if (!empresaOk) {
        showAlert({
          type: "error",
          title: "Empresa não encontrada",
          description: "O CNPJ destinatário não está cadastrado. Deseja cadastrá-la agora?",
          confirmLabel: "Cadastrar empresa",
          cancelLabel: "Cancelar",
          confirmVariant: "outline",
          onConfirm: () => {
            localStorage.setItem("empresa_pre_cadastro", JSON.stringify({
              cnpj: nfeNorm.destinatario_documento,
              razao_social: nfeNorm.destinatario_nome,
              nome_fantasia: "",
              inscricao_estadual: nfeNorm.destinatario_ie || "",
              endereco: nfeNorm.destinatario_endereco || "",
              numero: "",
              bairro: "",
              cidade: "",
              estado: "",
              cep: "",
            }));
            sessionStorage.setItem("empresa_retornar_fiscal", "1");
            navigate("/EmpresasConfigPage");
          },
        });
        return;
      }

      if (!fornecedorOk) {
        showAlert({
          type: "confirm",
          title: "Fornecedor não cadastrado",
          description: "Deseja cadastrar este fornecedor agora?",
          confirmLabel: "Cadastrar fornecedor",
          cancelLabel: "Cancelar importação",
          confirmVariant: "outline",
          onConfirm: () => {
            localStorage.setItem("fornecedor_pre_cadastro", JSON.stringify({
              cnpj: nfeNorm.emitente_cnpj,
              razao_social: nfeNorm.emitente_nome,
              inscricao_estadual: nfeNorm.emitente_ie || "",
              situacao_icms: nfeNorm.emitente_ie ? "CONTRIBUINTE" : "",
            }));
            navigate("/FornecedoresPage");
          },
        });
        return;
      }

      // Tenta enriquecer itens com codigo_unico via vinculos cadastrados
      let nfeToImport = nfeNorm;
      if (Array.isArray(nfeToImport.itens) && nfeToImport.itens.length > 0) {
        const { data: vinculos } = await supabase
          .from("config_vinculos")
          .select("codigo_produto_fornecedor, codigo_unico")
          .eq("empresa_id", empresa_id);
        if (vinculos?.length) {
          const mapVinculos = Object.fromEntries(vinculos.map(v => [v.codigo_produto_fornecedor, v.codigo_unico]));
          nfeToImport = {
            ...nfeToImport,
            itens: nfeToImport.itens.map(item => ({
              ...item,
              codigo_unico: mapVinculos[item.codigo] || mapVinculos[item.codigo_produto] || item.codigo_unico || null,
            })),
          };
        }
      }

      importarMutation.mutate(nfeToImport);
    } finally {
      setValidating(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseXmlNFe(ev.target.result);
      if (result.ok) {
        setParsedNFe(result);
      } else {
        showAlert({ type: "error", title: "Erro ao ler XML", description: "Não foi possível ler o arquivo. Verifique se é um XML de NF-e válido.", confirmLabel: "Fechar", cancelLabel: null, onConfirm: null });
      }
    };
    reader.readAsText(file);
  };

  const handleChaveManual = () => {
    const chave = chaveManual.replace(/\D/g, "");
    if (chave.length !== 44) {
      showAlert({ type: "error", title: "Chave inválida", description: "A chave DANFE deve ter 44 dígitos numéricos.", confirmLabel: "Fechar", cancelLabel: null, onConfirm: null });
      return;
    }
    setParsedNFe({
      ok: true,
      chave,
      numero: "",
      serie: "",
      data_emissao: "",
      data_entrada_saida: "",
      valor_total: 0,
      emitente_cnpj: "",
      emitente_nome: "Importado via chave DANFE",
      emitente_endereco: "",
      destinatario_documento: "",
      destinatario_nome: "",
      destinatario_endereco: "",
      itens: [],
      duplicatas: [],
      impostos: {},
    });
  };

  const closeImport = () => {
    setImportDialog(false);
    setParsedNFe(null);
    setChaveManual("");
  };

  const getViewData = (nota) => ({
    chave: nota.chave_nfe,
    numero: nota.numero_nf,
    serie: nota.serie,
    data_emissao: nota.data_emissao,
    data_entrada_saida: nota.data_entrada_saida,
    valor_total: nota.valor_total_nf,
    emitente_cnpj: nota.emitente_cnpj,
    emitente_nome: nota.emitente_nome,
    emitente_endereco: nota.emitente_endereco,
    destinatario_documento: nota.destinatario_documento,
    destinatario_nome: nota.destinatario_nome,
    destinatario_endereco: nota.destinatario_endereco,
    itens: Array.isArray(nota.itens) ? nota.itens : (nota.itens ? JSON.parse(nota.itens) : []),
    duplicatas: Array.isArray(nota.duplicatas) ? nota.duplicatas : (nota.duplicatas ? JSON.parse(nota.duplicatas) : []),
    impostos: nota.impostos && typeof nota.impostos === "object" ? nota.impostos : (nota.impostos ? JSON.parse(nota.impostos) : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fiscal — Notas Fiscais Importadas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{notas.length} nota(s) importada(s)</p>
        </div>
        <Button onClick={() => setImportDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Importar NF-e
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Input
          className="pl-9"
          placeholder="Buscar por número, emitente ou chave..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
      </div>

      <ErpTableContainer>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-900">NF Nº</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Série</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Emitente</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Data Emissão</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Valor Total</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Chave NF-e</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma nota fiscal importada ainda.</td></tr>
            )}
            {filtered.map(n => (
              <tr key={n.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{n.numero_nf || "-"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{n.serie || "-"}</td>
                <td className="px-4 py-3 font-medium">{n.emitente_nome || "-"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{n.data_emissao || "-"}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">
                  {n.valor_total_nf ? `R$ ${parseFloat(n.valor_total_nf).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[180px]" title={n.chave_nfe}>
                  {n.chave_nfe ? n.chave_nfe.slice(0, 20) + "…" : "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewTarget(getViewData(n))} title="Visualizar" className="text-blue-600 hover:text-blue-700 h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(n)} title="Excluir" className="text-red-600 hover:text-red-700 h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ErpTableContainer>

      {/* Modal Importação */}
      <Dialog open={importDialog} onOpenChange={closeImport}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Nota Fiscal Eletrônica (NF-e)</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
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

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Chave DANFE (44 dígitos)</p>
              <div className="flex gap-2">
                <Input
                  value={chaveManual}
                  onChange={e => setChaveManual(e.target.value.replace(/\D/g, "").slice(0, 44))}
                  placeholder="00000000000000000000000000000000000000000000"
                  className="font-mono text-xs"
                />
                <Button onClick={handleChaveManual} variant="ghost">Ler</Button>
              </div>
            </div>

            {parsedNFe && <NFePreview data={parsedNFe} />}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="ghost" onClick={closeImport}>Cancelar</Button>
            {parsedNFe && (
              <Button
                onClick={() => validarEImportar(parsedNFe)}
                disabled={importarMutation.isPending || validating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {validating ? "Validando..." : importarMutation.isPending ? "Salvando..." : "Inserir Nota Fiscal"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja importar a NF-e <strong>nº {parsedNFe?.numero || "—"}</strong> de <strong>{parsedNFe?.emitente_nome || "—"}</strong>?
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel onClick={() => setConfirmDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importarMutation.mutate(parsedNFe)}
              disabled={importarMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {importarMutation.isPending ? "Importando..." : "Confirmar Importação"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visualização da NF */}
      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Nota Fiscal</DialogTitle>
          </DialogHeader>
          {viewTarget && <NFePreview data={viewTarget} readOnly />}
        </DialogContent>
      </Dialog>

      {/* Exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir Nota Fiscal</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a NF-e <strong>nº {deleteTarget?.numero_nf}</strong>? Ela será marcada como deletada.
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