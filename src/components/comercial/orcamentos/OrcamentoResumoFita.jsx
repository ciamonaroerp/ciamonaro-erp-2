/**
 * Painel lateral — Resumo do Orçamento (Estilo Fita de Calculadora)
 * Exibe em tempo real: informações, produto, artigos e acabamentos com custo_un do backend
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/lib/supabaseClient";
import { Receipt } from "lucide-react";

function fmtMoeda(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LinhaFita({ descricao, valor, bold = false, mono = true }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[3px]">
      <span
        className={`text-[11px] leading-snug truncate flex-1 ${bold ? "font-semibold text-slate-800" : "text-slate-600"}`}
        style={mono ? { fontFamily: "monospace" } : {}}
      >
        {descricao}
      </span>
      {valor !== undefined && (
        <span
          className={`text-[11px] shrink-0 font-mono ${bold ? "font-bold text-blue-700" : "text-slate-600"}`}
        >
          {valor}
        </span>
      )}
    </div>
  );
}

function Divisor() {
  return <div className="border-t border-dashed border-slate-300 my-2" />;
}

function SecaoTitulo({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-3 mb-1">
      {children}
    </p>
  );
}

export default function OrcamentoResumoFita({ form, orcamentoId, empresaId }) {
  // Compartilha cache com AbaConfiguracaoOrcamento
  const { data: itens = [] } = useQuery({
    queryKey: ["orcamento-itens", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      const { data } = await supabase.from("orcamento_itens").select("*").eq("orcamento_id", orcamentoId).order("sequencia");
      return data || [];
    },
    enabled: !!orcamentoId,
    staleTime: 5000,
  });

  // Filtra itens válidos primeiro
  const itensValidos = itens.filter(i => i != null);

  // Busca custo_un da tabela_precos_sync para os codigos_unicos presentes nos itens
  const codigosUnicos = [...new Set(itensValidos.map(i => i.codigo_unico).filter(Boolean))];
  const produtoIds = [...new Set(itensValidos.map(i => i.produto_id).filter(Boolean))];

  const { data: custosSync = [] } = useQuery({
    queryKey: ["fita-custos-sync", empresaId, codigosUnicos.join(",")],
    queryFn: async () => {
      if (!empresaId || codigosUnicos.length === 0) return [];
      const { data } = await supabase.from("tabela_precos_sync").select("codigo_unico,produto_id,custo_un,artigo_nome,cor_nome").eq("empresa_id", empresaId).is("deleted_at", null).neq("status", "inativo");
      return data || [];
    },
    enabled: !!empresaId && codigosUnicos.length > 0,
    staleTime: 10000,
  });

  const getCustoUn = (codigo_unico, produto_id) => {
    const row = custosSync.find(c => c.codigo_unico === codigo_unico && c.produto_id === produto_id);
    return row?.custo_un ?? null;
  };

  const temDados = form?.titulo_orcamento || form?.cliente_nome || itens.length > 0;

  return (
    <div
      className="hidden lg:flex flex-col rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0"
      style={{ width: 300, background: "#f8fafc", maxHeight: "90vh" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-white shrink-0">
        <Receipt className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Resumo</span>
      </div>

      {/* Tape body */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ fontFamily: "monospace" }}>
        {!temDados ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
            <Receipt className="h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-400">Preencha o orçamento<br />para ver o resumo aqui</p>
          </div>
        ) : (
          <>
            {/* ── SEÇÃO 1: INFORMAÇÕES ── */}
            <SecaoTitulo>Informações</SecaoTitulo>

            {form?.titulo_orcamento && (
              <LinhaFita descricao={form.titulo_orcamento} bold mono={false} />
            )}
            {form?.cliente_nome && (
              <LinhaFita descricao={`Cliente: ${form.cliente_nome}`} />
            )}
            {form?.vendedor && (
              <LinhaFita descricao={`Vendedor: ${form.vendedor}`} />
            )}

            {/* ── ITENS ── */}
            {itensValidos.length > 0 && (
              <>
                <Divisor />
                <SecaoTitulo>Itens do Orçamento</SecaoTitulo>

                {itensValidos.map((item, idx) => {
                  // Double-check item validity
                  if (!item) return null;
                  return (
                    <div key={item.id || idx} className="mb-3">
                      {/* Artigo / Cor com custo_un */}
                       {item?.codigo_unico && (
                        <div className="pl-2 border-l-2 border-slate-200 space-y-0.5">
                          {(() => {
                            const custo = getCustoUn(item.codigo_unico, item.produto_id);
                            const label = [item.nome_linha_comercial, item.artigo_nome, item.nome_cor].filter(Boolean).join(" | ") || item.codigo_unico;
                            return (
                              <LinhaFita
                                descricao={label}
                                valor={custo != null ? `R$ ${fmtMoeda(custo)}` : "—"}
                              />
                            );
                          })()}
                        </div>
                      )}

                      {/* Acabamentos */}
                      {item.acabamentos?.length > 0 && (
                        <div className="pl-2 border-l-2 border-slate-200 mt-1 space-y-0.5">
                          {item.acabamentos.map((a, i) => (
                            <LinhaFita key={i} descricao={`+ ${a}`} />
                          ))}
                        </div>
                      )}

                      {/* Personalizações */}
                      {item.personalizacoes?.length > 0 && (
                        <div className="pl-2 border-l-2 border-purple-200 mt-1 space-y-0.5">
                          {item.personalizacoes.map((p, i) => (
                            <LinhaFita key={i} descricao={`✦ ${p}`} />
                          ))}
                        </div>
                      )}

                      {/* Subtotal do item */}
                      <div className="flex justify-between mt-1 pt-1 border-t border-dotted border-slate-200">
                        <span className="text-[10px] text-slate-400 font-mono">Subtotal</span>
                        <span className="text-[11px] font-bold text-blue-700 font-mono">
                          R$ {fmtMoeda(item.subtotal)}
                        </span>
                      </div>

                      {idx < itensValidos.length - 1 && <Divisor />}
                    </div>
                  );
                })}

                {/* Total geral */}
                <Divisor />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-bold text-slate-700 font-mono uppercase">TOTAL</span>
                  <span className="text-sm font-extrabold text-blue-800 font-mono">
                    R$ {fmtMoeda(itensValidos.reduce((s, i) => s + (parseFloat(i?.subtotal) || 0), 0))}
                  </span>
                </div>
              </>
            )}

            {/* Estado vazio de itens */}
            {orcamentoId && itensValidos.length === 0 && (
              <>
                <Divisor />
                <p className="text-[11px] text-slate-400 text-center py-4">
                  Nenhum item ainda.<br />Acesse a aba Configuração.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* Rodapé estilo comprovante */}
      <div className="px-4 py-2 border-t border-dashed border-slate-300 bg-slate-50 shrink-0">
        <p className="text-[9px] text-center text-slate-400 font-mono uppercase tracking-widest">
          * * * CIAMONARO ERP * * *
        </p>
      </div>
    </div>
  );
}