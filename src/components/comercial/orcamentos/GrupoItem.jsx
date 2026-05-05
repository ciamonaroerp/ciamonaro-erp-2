/**
 * Componente para exibir item agrupado (produto composto)
 * Exibe cabeçalho + linhas de índices + detalhes
 */
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtMoeda(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Grid de 9 colunas: [#seq] [tipo] [quant] [produto] [item+linha] [artigo] [cor] [vl.unit] [subtotal] + ações
const GRID = "grid grid-cols-[28px_30px_60px_3fr_0.9fr_1.2fr_0.9fr_1fr_1fr_80px] gap-x-3 items-center";

export default function GrupoItem({ grupo, onEditar, onExcluir, readOnly = false }) {
  const primeiro = grupo[0];
  const isProduto = primeiro.tipo_item === "Produto";
  const isServico = primeiro.tipo_item === "Serviço";
  const isProdutoServico = primeiro.tipo_item === "Produto e Serviço";

  const nomeDescricao = isServico
    ? (primeiro.observacoes || "Serviço")
    : (primeiro.nome_produto || "—");

  // Verifica se há detalhes comuns (primeiro item)
  const hasAcabamentos = Array.isArray(primeiro.acabamentos) && primeiro.acabamentos.length > 0;
  const hasPersonalizacoes = Array.isArray(primeiro.personalizacoes) && primeiro.personalizacoes.length > 0;
  const hasOperacoes = Array.isArray(primeiro.operacoes) && primeiro.operacoes.length > 0;
  const hasItensAdicionais = Array.isArray(primeiro.itens_adicionais) && primeiro.itens_adicionais.length > 0;

  const hasDetalhes = (isProduto || isProdutoServico)
    ? (hasAcabamentos || hasPersonalizacoes || hasOperacoes || hasItensAdicionais)
    : isServico
    ? (hasOperacoes || hasPersonalizacoes || hasItensAdicionais || primeiro.observacoes)
    : false;

  // Calcula rateio para Produto e Serviço
  const vlrProduto = isProdutoServico ? ((parseFloat(primeiro.produto_percentual) / 100) * parseFloat(primeiro.valor_unitario)) : null;
  const vlrServico = isProdutoServico ? ((parseFloat(primeiro.servico_percentual) / 100) * parseFloat(primeiro.valor_unitario)) : null;

  // Ordena itens por índice
  const itensOrdenados = [...grupo].sort((a, b) => (a.indice || 1) - (b.indice || 1));
  const primeiro_item = itensOrdenados[0];
  const restantes = itensOrdenados.slice(1);

  return (
    <div className="border-x border-b border-slate-200 bg-white hover:bg-slate-50/60 transition-colors last:rounded-b-xl overflow-hidden">
      {/* LINHA PRINCIPAL: [#SEQ] | [TIPO] | [QUANT] | [PRODUTO] | [ITEM+LINHA] | [ARTIGO] | [COR] | [VLR.UNIT] | [SUBTOTAL] */}
      <div className={`${GRID} px-3 py-2.5 h-auto`}>
        {/* COLUNA 0: NÚMERO SEQUENCIAL */}
        <span className="text-xs font-bold text-slate-400 text-center">
          #{primeiro.sequencia || "—"}
        </span>

        {/* COLUNA 1: TIPO (P/S/PS) */}
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold shrink-0 ${
          isProduto ? "bg-blue-100 text-blue-700" :
          isServico ? "bg-purple-100 text-purple-700" :
          "bg-amber-100 text-amber-700"
        }`} title={primeiro.tipo_item}>
          {isProduto ? "P" : isServico ? "S" : "PS"}
        </span>

        {/* COLUNA 2: QUANTIDADE */}
        <span className="text-xs font-semibold text-slate-700 text-center">
          {primeiro.quantidade}
        </span>

        {/* COLUNA 3: PRODUTO / SERVIÇO */}
        <span className="text-xs font-medium text-slate-800 line-clamp-2" title={nomeDescricao}>
          {nomeDescricao}
        </span>

        {/* COLUNA 4: ITEM [1] + LINHA */}
        {isServico ? (
          <span className="text-slate-300 text-xs">—</span>
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-100 text-blue-700 font-bold text-[8px] shrink-0">
              {primeiro_item.indice || 1}
            </span>
            <span className="text-slate-600 truncate text-xs" title={primeiro_item.linha_nome || "—"}>
              {primeiro_item.linha_nome || <span className="text-slate-300">—</span>}
            </span>
          </div>
        )}

        {/* COLUNA 5: ARTIGO (completo, sem truncate) */}
        {isServico ? (
          <span className="text-slate-300 text-xs">—</span>
        ) : (
          <span className="text-slate-700 text-xs" title={primeiro_item.artigo_nome || "—"}>
            {primeiro_item.artigo_nome || <span className="text-slate-300">—</span>}
          </span>
        )}

        {/* COLUNA 6: COR */}
        {isServico ? (
          <span className="text-slate-300 text-xs">—</span>
        ) : (
          <span className="text-slate-600 truncate text-xs" title={primeiro_item.cor_nome || "—"}>
            {primeiro_item.cor_nome || <span className="text-slate-300">—</span>}
          </span>
        )}

        {/* COLUNA 7: VLR.UNIT */}
        <span className="text-xs text-slate-600 text-right">
          R$ {fmtMoeda(primeiro.valor_unitario)}
        </span>

        {/* COLUNA 8: SUBTOTAL */}
        <span className="text-xs font-bold text-blue-700 text-right">
          R$ {fmtMoeda(primeiro.subtotal)}
        </span>

        {/* COLUNA 9: AÇÕES */}
        {!readOnly && (
          <div className="flex items-center gap-0.5 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600"
              onClick={() => onEditar(primeiro)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600"
              onClick={() => onExcluir(primeiro, grupo)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* LINHAS SECUNDÁRIAS: índices 2, 3, 4... */}
      {restantes.map((item) => (
        <div key={item.id} className={`${GRID} px-3 py-2 bg-slate-50/50 border-t border-slate-100 text-xs h-auto`}>
          {/* COLUNA 0: vazio (seq) */}
          <span></span>

          {/* COLUNA 1: vazio (tipo) */}
          <span></span>

          {/* COLUNA 2: vazio (quant) */}
          <span></span>

          {/* COLUNA 3: vazio (produto) */}
          <span></span>

          {/* COLUNA 4: ITEM [2,3,4...] + LINHA */}
          <div className="flex items-center gap-1 min-w-0">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-200 text-slate-700 font-bold text-[8px] shrink-0">
              {item.indice || 1}
            </span>
            <span className="text-slate-600 truncate text-xs" title={item.linha_nome || "—"}>
              {item.linha_nome || <span className="text-slate-300">—</span>}
            </span>
          </div>

          {/* COLUNA 5: ARTIGO */}
          <span className="text-slate-700 text-xs" title={item.artigo_nome || "—"}>
            {item.artigo_nome || <span className="text-slate-300">—</span>}
          </span>

          {/* COLUNA 6: COR */}
          <span className="text-slate-600 truncate text-xs" title={item.cor_nome || "—"}>
            {item.cor_nome || <span className="text-slate-300">—</span>}
          </span>

          {/* COLUNA 7: VLR.UNIT vazio */}
          <span></span>

          {/* COLUNA 8: SUBTOTAL vazio */}
          <span></span>
        </div>
      ))}

      {/* DETALHES: aparecem UMA VEZ, FORA DO GRID */}
      {hasDetalhes && (
        <div className="pl-[166px] pr-3 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
          {hasAcabamentos && (
            <span className="text-slate-500">
              <span className="font-medium text-slate-600">Acabamentos: </span>
              {primeiro.acabamentos.map(a => a?.descricao || a?.nome_acabamento || String(a)).join(", ")}
            </span>
          )}
          {hasPersonalizacoes && (
            <span className="text-slate-500">
              <span className="font-medium text-slate-600">Personalização: </span>
              {primeiro.personalizacoes.map(p => {
                const desc = p?.descricao || p?.tipo_personalizacao || String(p);
                const partes = [];
                if (p?.cores) partes.push(`${p.cores} cor${p.cores > 1 ? 'es' : ''}`);
                if (p?.posicoes) partes.push(`${p.posicoes} posição${p.posicoes > 1 ? 'ões' : ''}`);
                return partes.length > 0 ? `${desc} (${partes.join(", ")})` : desc;
              }).join(" | ")}
            </span>
          )}
          {hasOperacoes && (
            <span className="text-slate-500">
              <span className="font-medium text-slate-600">Operações: </span>
              {primeiro.operacoes.map(o => {
                const tipo = o?.tipo || o?.descricao || o?.tipo_dependencia || String(o);
                const qtd = o?.quantidade != null ? String(o.quantidade).padStart(2, "0") : null;
                return qtd ? `${tipo}: ${qtd}` : tipo;
              }).join(" | ")}
            </span>
          )}
          {hasItensAdicionais && (
            <span className="text-slate-500">
              <span className="font-medium text-slate-600">Itens adicionais: </span>
              {primeiro.itens_adicionais.map(a => a?.descricao || a?.tipo_dependencia || "—").join(", ")}
            </span>
          )}
        </div>
      )}

      {/* RATEIO: só para Produto e Serviço, FORA DO GRID */}
      {isProdutoServico && (
        <div className="pl-[166px] pr-3 py-2 bg-slate-50 border-t border-slate-100 flex gap-6 text-[11px]">
          <span className="text-slate-500">
            <span className="font-medium text-blue-600">Produto ({primeiro.produto_percentual}%): </span>
            {primeiro.quantidade} × R$ {fmtMoeda(vlrProduto)} = <strong>R$ {fmtMoeda(primeiro.quantidade * vlrProduto)}</strong>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">
            <span className="font-medium text-purple-600">Serviço ({primeiro.servico_percentual}%): </span>
            {primeiro.quantidade} × R$ {fmtMoeda(vlrServico)} = <strong>R$ {fmtMoeda(primeiro.quantidade * vlrServico)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}