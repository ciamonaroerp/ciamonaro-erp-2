import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/components/lib/supabaseClient";
import { useSupabaseAuth } from "@/components/context/SupabaseAuthContext";
import PageHeader from "@/components/admin/PageHeader";
import KanbanPPCP from "@/components/comercial/KanbanPPCP";
import FormularioPPCP from "@/components/comercial/FormularioPPCP";
import KanbanLogistica from "@/components/comercial/KanbanLogistica";
import FormularioFrete from "@/components/comercial/FormularioFrete";
import DashboardPPCP from "@/components/comercial/DashboardPPCP";
import DashboardLogistica from "@/components/comercial/DashboardLogistica";


export default function ComercialPage() {
  const [cardContext, setCardContext] = useState("ppcp");
  const [showFormPPCP, setShowFormPPCP] = useState(false);
  const [showFormFrete, setShowFormFrete] = useState(false);
  const [loading, setLoading] = useState(false);
  const { erpUsuario } = useSupabaseAuth();
  const usuarioAtual = erpUsuario;
  const [empresaId, setEmpresaId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (erpUsuario) {
      const empId = erpUsuario.empresa_id || window.localStorage.getItem("empresa_id");
      setEmpresaId(empId);
    }
  }, [erpUsuario]);

  const criarSolicitacaoPPCP = async (dados) => {
    if (!usuarioAtual?.email) { alert("Usuário não autenticado."); return; }
    if (!empresaId) { alert("Empresa não definida. Faça login novamente."); return; }
    try {
      setLoading(true);
      const numero = `PPCP-${Date.now()}`;
      const tipos = Object.entries(dados.personalizacoes || {}).filter(([_, v]) => v).map(([k]) => k);
      const tipo_principal = tipos.length > 0 ? tipos[0] : "Nenhuma";
      const { error } = await supabase.from("solicitacaoppcp").insert({
        numero_solicitacao: numero,
        vendedor_email: usuarioAtual.email,
        cliente_nome: dados.cliente_nome || "A definir",
        artigo: dados.artigo,
        cor: dados.cor || null,
        modelo: dados.modelo || null,
        quantidade: dados.quantidade,
        tipo_personalizacao: tipo_principal,
        mangas_personalizadas: dados.personalizacoes?.manga ? dados.mangas_personalizadas : null,
        num_cores_silkscreen: dados.personalizacoes?.silkscreen ? (dados.num_cores_silkscreen || 0) : null,
        num_posicoes_silkscreen: dados.personalizacoes?.silkscreen ? (dados.num_posicoes_silkscreen || 0) : null,
        data_entrega_cliente: dados.data_entrega_cliente,
        observacoes_vendedor: dados.observacoes_vendedor || "",
        status: "Enviado ao PPCP",
        setor_origem: "COMERCIAL",
        setor_destino: "PPCP",
        empresa_id: empresaId,
      });
      if (error) throw new Error(error.message);
      setShowFormPPCP(false);
      setRefreshKey(prev => prev + 1);
      alert("Solicitação PPCP criada com sucesso!");
    } catch (error) {
      alert(`Erro: ${error.message || "Falha ao criar solicitação"}`);
    } finally {
      setLoading(false);
    }
  };

  const criarSolicitacaoFrete = async (dados) => {
    if (!usuarioAtual?.email) { alert("Usuário não autenticado."); return; }
    if (!empresaId) { alert("Empresa não definida. Faça login novamente."); return; }
    try {
      setLoading(true);
      const numero = `FRETE-${Date.now()}`;
      const { error } = await supabase.from("solicitacaofrete").insert({
        numero_solicitacao: numero,
        vendedor_email: usuarioAtual.email,
        cliente_nome: dados.cliente_nome || "",
        cep_destino: dados.cep_destino || "",
        data_entrega: dados.data_entrega || null,
        quantidade_camisetas: dados.quantidade_camisetas || 0,
        valor_mercadoria: dados.valor_mercadoria || 0,
        observacoes_vendedor: dados.observacoes_vendedor || "",
        status: "Enviado à logística",
        setor_origem: "COMERCIAL",
        setor_destino: "LOGISTICA",
        empresa_id: empresaId,
      });
      if (error) throw new Error(error.message);
      setShowFormFrete(false);
      setRefreshKey(prev => prev + 1);
      alert("Solicitação de frete criada com sucesso!");
    } catch (error) {
      alert(`Erro: ${error.message || "Falha ao criar solicitação"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comercial"
        description="Gerencie solicitações PPCP e cotações de frete"
      />

      {cardContext === "ppcp" ? (
        <DashboardPPCP showCards={true} />
      ) : (
        <DashboardLogistica showCards={true} />
      )}

      <div className="flex gap-3 items-center py-4 border-b border-slate-200">
        <Button
          variant={cardContext === "ppcp" ? "default" : "outline"}
          size="sm"
          onClick={() => setCardContext("ppcp")}
          style={cardContext === "ppcp" ? { background: '#3B5CCC' } : {}}
          className={cardContext === "ppcp" ? "text-white" : ""}
        >
          PPCP
        </Button>
        <Button
          variant={cardContext === "logistica" ? "default" : "outline"}
          size="sm"
          onClick={() => setCardContext("logistica")}
          style={cardContext === "logistica" ? { background: '#3B5CCC' } : {}}
          className={cardContext === "logistica" ? "text-white" : ""}
        >
          LOGÍSTICA
        </Button>
        {cardContext === "ppcp" ? (
          <Button onClick={() => setShowFormPPCP(true)} className="gap-2 text-white ml-auto" style={{ background: '#3B5CCC' }}>
            <Plus className="h-4 w-4" /> Nova Solicitação PPCP
          </Button>
        ) : (
          <Button onClick={() => setShowFormFrete(true)} className="gap-2 text-white ml-auto" style={{ background: '#3B5CCC' }}>
            <Plus className="h-4 w-4" /> Nova Cotação de Frete
          </Button>
        )}
      </div>

      {cardContext === "ppcp" ? (
        <div>
          <KanbanPPCP key={refreshKey} usuarioAtual={usuarioAtual} />
        </div>
      ) : (
        <div>
          <KanbanLogistica key={refreshKey} usuarioAtual={usuarioAtual} />
        </div>
      )}

      {showFormPPCP && (
        <FormularioPPCP
          onClose={() => setShowFormPPCP(false)}
          onSubmit={criarSolicitacaoPPCP}
          loading={loading}
        />
      )}

      {showFormFrete && (
        <FormularioFrete
          onClose={() => setShowFormFrete(false)}
          onSubmit={criarSolicitacaoFrete}
          loading={loading}
        />
      )}
    </div>
  );
}