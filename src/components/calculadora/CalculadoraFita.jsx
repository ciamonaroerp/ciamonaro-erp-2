/**
 * Fita da Calculadora — painel lateral estilo comprovante de caixa
 * Exibe em tempo real conforme o usuário preenche o formulário
 */
import { Receipt } from "lucide-react";

function fmtMoeda(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LinhaFita({ descricao, valor, bold = false }) {
  return (
    <div className="flex justify-between items-baseline py-[3px] gap-2">
      <span className={`text-[11px] leading-snug font-mono break-words ${bold ? "font-semibold text-slate-800" : "text-slate-600"}`}>
        {descricao}
      </span>
      {valor !== undefined && (
        <span className={`text-[11px] font-mono shrink-0 ${bold ? "font-bold text-blue-700" : "text-slate-500"}`}>
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

export default function CalculadoraFita({ form, artigos, composicoes, acabamentos, personalizacoes = [], valor_unitario }) {
  const getCusto = (descricaoArtigo) => {
    const art = artigos.find(a => a.descricao_artigo === descricaoArtigo);
    if (!art) return null;
    return art.custo_un ?? art.custo_unitario ?? art.custo ?? art.preco ?? art.valor ?? null;
  };

  const temDados = form.quantidade || form.modelo_codigo || form.artigo ||
    form.artigos_compostos?.some(a => a.artigo);

  return (
    <div
      className="hidden lg:flex flex-col rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0"
      style={{ width: 280, background: "#f8fafc", maxHeight: "calc(100vh - 120px)", position: "sticky", top: 24 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-white shrink-0">
        <Receipt className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Resumo</span>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!temDados ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
            <Receipt className="h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-400">Preencha o formulário<br />para ver o resumo aqui</p>
          </div>
        ) : (
          <>
            {/* ── INFORMAÇÕES ── */}
            <SecaoTitulo>Informações</SecaoTitulo>
            {form.quantidade && <LinhaFita descricao="Quantidade" valor={`${form.quantidade} un.`} />}
            {form.estado && <LinhaFita descricao="Estado" valor={form.estado} />}
            <LinhaFita descricao="Cliente I.E." valor={form.cliente_ie ? "Sim" : "Não"} />
            <LinhaFita descricao="Pagamento" valor={form.forma_pagamento === "financeira" ? "Financeira" : "Padrão"} />

            {/* ── MODELO ── */}
            {form.modelo_codigo && (
              <>
                <Divisor />
                <SecaoTitulo>Modelo</SecaoTitulo>
                <LinhaFita descricao={form.modelo_nome || form.modelo_codigo} bold />
              </>
            )}

            {/* ── ARTIGO E COR — simples ── */}
            {composicoes.length === 0 && form.artigo && (
              <>
                <Divisor />
                <SecaoTitulo>Artigo e Cor</SecaoTitulo>
                {(() => {
                  const custo = getCusto(form.artigo);
                  return (
                    <LinhaFita
                      descricao={form.artigo}
                      valor={custo != null ? `R$ ${fmtMoeda(custo)}` : undefined}
                      bold
                    />
                  );
                })()}
              </>
            )}

            {/* ── ARTIGO E COR — composto ── */}
            {composicoes.length > 0 && form.artigos_compostos?.some(a => a.artigo) && (
              <>
                <Divisor />
                <SecaoTitulo>Artigos por Composição</SecaoTitulo>
                {form.artigos_compostos.map((ac, i) => {
                  if (!ac.artigo) return null;
                  const custo = getCusto(ac.artigo);
                  const compInfo = composicoes.find(c => c.composicao === ac.composicao);
                  return (
                    <div key={i} className="mb-1.5">
                      <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wide">
                        {compInfo?.nome || `Cor ${ac.composicao}`}
                      </p>
                      <LinhaFita
                        descricao={ac.artigo}
                        valor={custo != null ? `R$ ${fmtMoeda(custo)}` : undefined}
                        bold
                      />
                    </div>
                  );
                })}
              </>
            )}

            {/* ── ACABAMENTOS ── */}
            {form.acabamentos_sel?.length > 0 && (
              <>
                <Divisor />
                <SecaoTitulo>Acabamentos</SecaoTitulo>
                {form.acabamentos_sel.map((nome, i) => {
                  const acab = acabamentos.find(ac => ac.nome_acabamento === nome);
                  const val = acab?.valor_acab_un;
                  return (
                    <LinhaFita
                      key={i}
                      descricao={`+ ${nome}`}
                      valor={val != null ? `R$ ${fmtMoeda(val)}` : undefined}
                    />
                  );
                })}
              </>
            )}

            {/* ── PERSONALIZAÇÕES ── */}
            {form.personalizacoes_sel?.length > 0 && (
              <>
                <Divisor />
                <SecaoTitulo>Personalização</SecaoTitulo>
                {form.personalizacoes_sel.map((tipo, i) => {
                  const pers = personalizacoes.find(p => p.tipo_personalizacao === tipo);
                  const det = form.personalizacoes_detalhes?.[tipo] || {};
                  if (!pers) return null;

                  // Usa flags booleanas do backend — UMA linha por item
                  let valorExib;

                  if (pers.usa_valor_unitario && det.valor_variavel) {
                    valorExib = `R$ ${det.valor_variavel}`;
                  } else if (pers.valor_pers_un != null && !pers.usa_valor_unitario && !pers.usa_posicoes && !pers.usa_cores) {
                    valorExib = `R$ ${fmtMoeda(pers.valor_pers_un)}`;
                  }

                  const partes = [];
                  if (pers.usa_posicoes && det.posicoes) partes.push(`pos: ${det.posicoes}`);
                  if (pers.usa_cores && det.cores) partes.push(`cor: ${det.cores}`);
                  if (partes.length > 0) valorExib = partes.join(' | ');

                  return (
                    <LinhaFita key={i} descricao={`❆ ${tipo}`} valor={valorExib} bold />
                  );
                })}
              </>
            )}

            {/* ── VALOR UNITÁRIO ── */}
            {valor_unitario !== null && (
              <>
                <Divisor />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-bold text-slate-700 font-mono uppercase">Valor Unit.</span>
                  <span className="text-sm font-extrabold text-blue-800 font-mono">
                    R$ {fmtMoeda(valor_unitario)}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Rodapé */}
      <div className="px-4 py-2 border-t border-dashed border-slate-300 bg-slate-50 shrink-0">
        <p className="text-[9px] text-center text-slate-400 font-mono uppercase tracking-widest">
          * * * CIAMONARO ERP * * *
        </p>
      </div>
    </div>
  );
}