/**
 * Utilitários compartilhados para orçamentos
 * Usados por AbaPagamentoOrcamento e ComercialOrcamentosPage
 */
import { format } from "date-fns";

function fmtMoeda(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function gerarInformacoesHTML({ informacoesComplementares = [], condicoesComerciais = [], itens = [] }) {
  let html = "";
  
  const temProdutoServico = itens.some(i => i.tipo_item === 'Produto e Serviço');
  
  if (temProdutoServico && Array.isArray(informacoesComplementares) && informacoesComplementares.length > 0) {
    html += `<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0">`;
    informacoesComplementares.forEach(info => {
      if (info.titulo || info.descricao) {
        html += `<div style="margin-bottom:12px">`;
        if (info.titulo) html += `<div style="font-weight:600;color:#1e293b;margin-bottom:4px">${info.titulo}</div>`;
        if (info.descricao) {
          const descHtml = String(info.descricao).replace(/\n/g, '<br/>');
          html += `<div style="color:#475569;font-size:12px;line-height:1.6">${descHtml}</div>`;
        }
        html += `</div>`;
      }
    });
    html += `</div>`;
  }
  
  if (Array.isArray(condicoesComerciais) && condicoesComerciais.length > 0) {
    html += `<div style="margin-top:24px">`;
    html += `<h3 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin-bottom:12px">Condições Comerciais</h3>`;
    condicoesComerciais.forEach((condicao, idx) => {
      if (condicao.descricao) {
        const num = String(idx + 1).padStart(2, "0");
        const descHtml = String(condicao.descricao).replace(/\n/g, '<br/>');
        html += `<div style="margin-bottom:4px;color:#475569;font-size:11px;line-height:1.4"><strong>${num}.</strong> ${descHtml}</div>`;
      }
    });
    html += `</div>`;
  }
  
  return html;
}

/**
 * Gera texto formatado para WhatsApp e copia para clipboard.
 * @param {object} orcamento - registro do orçamento
 * @param {array} itens - itens do orçamento
 * @param {object} extra - { desconto, formaPagamento, parcelas, tipoFrete, valorFrete, subtotalItens, totalOrcamento, validadeProposta }
 */
export function gerarTextoWhatsApp({ orcamento, itens = [], extra = {} }) {
  const {
    desconto = 0,
    formaPagamento = "",
    parcelas = [],
    tipoFrete = "",
    valorFrete = 0,
    subtotalItens,
    totalOrcamento,
    validadeProposta = "",
  } = extra;

  const subTotal = subtotalItens ?? itens.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
  const frete = tipoFrete === "FOB" ? (parseFloat(orcamento?.valor_frete ?? valorFrete) || 0) : 0;
  const tipoFreteReal = tipoFrete || orcamento?.tipo_frete || "";
  const total = totalOrcamento ?? Math.max(0, subTotal + frete - desconto);
  const validade = validadeProposta || orcamento?.validade_proposta || "";

  const codigo = orcamento?.codigo_orcamento || "—";
  const dataFmt = orcamento?.created_at
    ? format(new Date(orcamento.created_at), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");
  const validadeFmt = validade ? format(new Date(validade), "dd/MM/yyyy") : "—";

  let txt = `📋 *ORÇAMENTO ${codigo}*\n`;
  txt += `📅 Data: ${dataFmt}\n`;
  if (orcamento?.cliente_nome) txt += `👤 Cliente: ${orcamento.cliente_nome}\n`;
  txt += "\n";

  if (itens.length > 0) {
    txt += `*ITENS:*\n`;

    // Agrupa por produto (indice=1 abre grupo, demais complementam)
    const itensPorSeq = [...itens].sort((a, b) => (a.sequencia || 0) - (b.sequencia || 0));
    const grupos = [];
    let grupoAtual = null;
    for (const item of itensPorSeq) {
      const indice = item.indice || 1;
      if (indice === 1) {
        grupoAtual = [item];
        grupos.push(grupoAtual);
      } else if (grupoAtual && item.produto_id === grupoAtual[0].produto_id) {
        grupoAtual.push(item);
      } else {
        grupoAtual = [item];
        grupos.push(grupoAtual);
      }
    }

    grupos.forEach(grupo => {
      const primeiro = grupo[0];
      const nome = primeiro.nome_produto || primeiro.nome_servico || "Serviço";
      const seqWpp = primeiro.sequencia ? `#${primeiro.sequencia} ` : "";
      txt += `\n• ${seqWpp}*${primeiro.quantidade} un.* ${nome}\n`;
      if (primeiro.resumo_composicoes) txt += `  Composição: ${primeiro.resumo_composicoes}\n`;
      if (primeiro.tipo_item === "Produto e Serviço") {
        const vlrProdutoWpp = (parseFloat(primeiro.produto_percentual) / 100) * parseFloat(primeiro.valor_unitario);
        const vlrServicoWpp = (parseFloat(primeiro.servico_percentual) / 100) * parseFloat(primeiro.valor_unitario);
        const hasPersonalizacoesWpp = Array.isArray(primeiro.personalizacoes) && primeiro.personalizacoes.length > 0;
        txt += `  📦 Produto (${primeiro.produto_percentual}%): ${primeiro.quantidade} × R$ ${fmtMoeda(vlrProdutoWpp)} = R$ ${fmtMoeda(primeiro.quantidade * vlrProdutoWpp)}\n`;
        if (hasPersonalizacoesWpp) {
          const persDescWpp = primeiro.personalizacoes.map(p => {
            const desc = p?.descricao || p?.tipo_personalizacao || String(p);
            const pts = [];
            if (p?.cores) pts.push(`${p.cores} cor${p.cores > 1 ? "es" : ""}`);
            if (p?.posicoes) pts.push(`${p.posicoes} posição${p.posicoes > 1 ? "ões" : ""}`);
            return pts.length > 0 ? `${desc} (${pts.join(", ")})` : desc;
          }).join(" | ");
          txt += `  🎨 Serviço de Personalização (${primeiro.servico_percentual}%): ${persDescWpp} — ${primeiro.quantidade} × R$ ${fmtMoeda(vlrServicoWpp)} = R$ ${fmtMoeda(primeiro.quantidade * vlrServicoWpp)}\n`;
        } else {
          txt += `  🔧 Serviço (${primeiro.servico_percentual}%): ${primeiro.quantidade} × R$ ${fmtMoeda(vlrServicoWpp)} = R$ ${fmtMoeda(primeiro.quantidade * vlrServicoWpp)}\n`;
        }
      }
      // Linhas de tecido por índice
      grupo.forEach(item => {
        const partes = [item.linha_nome, item.artigo_nome, item.cor_nome].filter(Boolean);
        if (partes.length > 0) {
          txt += `  [${item.indice || 1}] ${partes.join(' | ')}\n`;
        }
      });
      // Acabamentos
      if (Array.isArray(primeiro.acabamentos) && primeiro.acabamentos.length > 0) {
        const acbTexto = primeiro.acabamentos.map(a => a?.descricao || a?.nome_acabamento || String(a)).join(", ");
        txt += `  Acabamentos: ${acbTexto}\n`;
      }
      // Personalizações — exibe avulso apenas se NÃO for Produto e Serviço (neste caso já está no rateio)
      if (Array.isArray(primeiro.personalizacoes) && primeiro.personalizacoes.length > 0 && primeiro.tipo_item !== "Produto e Serviço") {
        const persTexto = primeiro.personalizacoes.map(p => {
          const desc = p?.descricao || p?.tipo_personalizacao || String(p);
          const partes = [];
          if (p?.cores) partes.push(`${p.cores} cores`);
          if (p?.posicoes) partes.push(`${p.posicoes} posições`);
          return partes.length > 0 ? `${desc} (${partes.join(", ")})` : desc;
        }).join(" | ");
        txt += `  Personalização: ${persTexto}\n`;
      }
      // Itens adicionais
      if (Array.isArray(primeiro.itens_adicionais) && primeiro.itens_adicionais.length > 0) {
        const adicTexto = primeiro.itens_adicionais.map(a => a?.descricao || a?.tipo_dependencia || "—").join(", ");
        txt += `  Itens adicionais: ${adicTexto}\n`;
      }
      txt += `  Vlr. unit.: R$ ${fmtMoeda(primeiro.valor_unitario)}\n`;
    });
  }

  txt += `\n━━━━━━━━━━━━━━━━\n`;
  txt += `💰 *Subtotal:* R$ ${fmtMoeda(subTotal)}\n`;
  if (tipoFreteReal === "FOB" && frete > 0) txt += `🚚 *Frete (FOB):* R$ ${fmtMoeda(frete)}\n`;
  if (tipoFreteReal === "CIF") txt += `🚚 *Frete:* CIF\n`;
  if (desconto > 0) txt += `🏷 *Desconto:* R$ ${fmtMoeda(desconto)}\n`;
  txt += `💵 *Total:* R$ ${fmtMoeda(total)}\n`;

  if (formaPagamento) txt += `\n💳 *Forma de pagamento:* ${formaPagamento}\n`;
  const exibirParcelasWpp = parcelas.length >= 1 && /(transferência|transferencia|boleto)/i.test(formaPagamento);
  if (exibirParcelasWpp) {
    const label = parcelas.length === 1 ? `1x` : `${parcelas.length}x`;
    txt += `\n📊 *Parcelamento (${label}):*\n`;
    parcelas.forEach(p => {
      const d = p.data ? format(new Date(p.data), "dd/MM/yyyy") : "—";
      txt += `  ${p.numero}ª — ${d} — R$ ${fmtMoeda(p.valor)}\n`;
    });
  }

  txt += `\n📅 *Validade da proposta:* ${validadeFmt}`;

  navigator.clipboard.writeText(txt);
  return txt;
}

/**
 * Renderiza um grupo (produto + índices) no PDF
 */
function renderGrupoPDF(primeiro, itensOrdenados) {
  const isProduto = primeiro.tipo_item === "Produto";
  const isServico = primeiro.tipo_item === "Serviço";
  const isProdutoServico = primeiro.tipo_item === "Produto e Serviço";

  const nomeDescricao = isServico
    ? (primeiro.nome_servico || primeiro.descricao_servico || "Serviço")
    : (primeiro.nome_produto || "—");

  // Ordena por índice e separa
  const primeiro_item = itensOrdenados[0];
  const restantes = itensOrdenados.slice(1);

  // Determina se há linha de detalhes extra (acabamentos, operações, rateio)
  const temAcabamentos = Array.isArray(primeiro.acabamentos) && primeiro.acabamentos.length > 0;
  const temPersonalizacoes = Array.isArray(primeiro.personalizacoes) && primeiro.personalizacoes.length > 0;
  const temOperacoes = Array.isArray(primeiro.operacoes) && primeiro.operacoes.length > 0;
  const temItensAdicionais = Array.isArray(primeiro.itens_adicionais) && primeiro.itens_adicionais.length > 0;
  const temDetalhes = temAcabamentos || temPersonalizacoes || temOperacoes || temItensAdicionais || isProdutoServico;

  // LINHA PRINCIPAL: produto + índice [1] + vlr + subtotal
  // Colunas: [#(5%)] [Qtd(9%)] [Produto/Serviço(26%)] [Item+Linha(15%)] [Artigo(14%)] [Cor(11%)] [Vlr.Unit(10%)] [Subtotal(10%)]
  // Se há mais índices ou detalhes, NÃO coloca border-bottom na linha principal
  const temLinhasAbaixo = restantes.length > 0 || temDetalhes;
  const bdStyle = temLinhasAbaixo ? "" : "border-bottom:1px solid #e2e8f0;";
  const seqLabel = primeiro.sequencia ? `#${primeiro.sequencia}` : "";

  let html = `
    <tr style="background:#fff">
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;font-size:11px;font-weight:700;color:#94a3b8;width:5%">${seqLabel}</td>
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;font-size:12px;font-weight:600;color:#374151;width:9%">${primeiro.quantidade} un.</td>
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;width:26%">
        <div style="font-size:12px;color:#1e293b;font-weight:500">${nomeDescricao}</div>
      </td>
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;font-size:12px;color:#64748b;width:15%"><strong>[${primeiro_item.indice || 1}]</strong> ${primeiro_item.linha_nome || ""}</td>
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;font-size:12px;color:#64748b;width:14%">${primeiro_item.artigo_nome || ""}</td>
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;font-size:12px;color:#64748b;width:11%">${primeiro_item.cor_nome || ""}</td>
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;font-size:12px;color:#64748b;text-align:right;width:10%">R$ ${fmtMoeda(primeiro.valor_unitario)}</td>
      <td style="padding:10px 8px 4px 8px;${bdStyle}vertical-align:top;font-size:12px;font-weight:700;color:#1d4ed8;text-align:right;width:10%">R$ ${fmtMoeda(primeiro.subtotal)}</td>
    </tr>`;

  // LINHAS ADICIONAIS: índices 2, 3, 4...
  if (restantes.length > 0) {
    const ultimoIdx = restantes.length - 1;
    html += restantes.map((item, idx) => {
      const isUltimo = idx === ultimoIdx && !temDetalhes;
      const bd = isUltimo ? "border-bottom:1px solid #e2e8f0;" : "";
      return `
    <tr style="background:#f8fafc">
      <td style="padding:3px 8px;${bd}vertical-align:top"></td>
      <td style="padding:3px 8px;${bd}vertical-align:top"></td>
      <td style="padding:3px 8px;${bd}vertical-align:top"></td>
      <td style="padding:3px 8px;${bd}vertical-align:top;font-size:11px;color:#64748b"><strong>[${item.indice || 1}]</strong> ${item.linha_nome || ""}</td>
      <td style="padding:3px 8px;${bd}vertical-align:top;font-size:11px;color:#64748b">${item.artigo_nome || ""}</td>
      <td style="padding:3px 8px;${bd}vertical-align:top;font-size:11px;color:#64748b">${item.cor_nome || ""}</td>
      <td style="padding:3px 8px;${bd}vertical-align:top"></td>
      <td style="padding:3px 8px;${bd}vertical-align:top"></td>
    </tr>`;
    }).join("");
  }

  // LINHA DE DETALHES: acabamentos, personalização, operações e rateio produto/serviço
  if (temDetalhes) {
    const detalhesPartes = [];
    if (temAcabamentos) {
      const acbStr = primeiro.acabamentos.map(a => a?.descricao || a?.nome_acabamento || String(a)).join(", ");
      detalhesPartes.push(`<span style="white-space:nowrap"><strong style="color:#64748b">Acabamentos:</strong> ${acbStr}</span>`);
    }
    // Exibe personalização avulsa apenas se NÃO for Produto e Serviço (neste caso aparece integrada no rateio)
    if (temPersonalizacoes && !isProdutoServico) {
      const persStr = primeiro.personalizacoes.map(p => {
        const desc = p?.descricao || p?.tipo_personalizacao || String(p);
        const pts = [];
        if (p?.cores) pts.push(`${p.cores} cores`);
        if (p?.posicoes) pts.push(`${p.posicoes} posições`);
        return pts.length > 0 ? `${desc} (${pts.join(", ")})` : desc;
      }).join(" | ");
      detalhesPartes.push(`<span style="white-space:nowrap"><strong style="color:#64748b">Personalização:</strong> ${persStr}</span>`);
    }
    if (temOperacoes) {
      const opStr = primeiro.operacoes.map(o => {
        const tipo = o?.tipo || o?.descricao || o?.tipo_dependencia || String(o);
        const qtd = o?.quantidade != null ? String(o.quantidade).padStart(2, "0") : null;
        return qtd ? `${tipo}: ${qtd}` : tipo;
      }).join(" | ");
      detalhesPartes.push(`<span style="white-space:nowrap"><strong style="color:#64748b">Operações:</strong> ${opStr}</span>`);
    }
    // Itens adicionais no PDF
    if (Array.isArray(primeiro.itens_adicionais) && primeiro.itens_adicionais.length > 0) {
      const adicStr = primeiro.itens_adicionais.map(a => a?.descricao || a?.tipo_dependencia || "—").join(", ");
      detalhesPartes.push(`<span style="white-space:nowrap"><strong style="color:#64748b">Itens adicionais:</strong> ${adicStr}</span>`);
    }

    let rateioRow = "";
    if (isProdutoServico) {
      const vlrProduto = (parseFloat(primeiro.produto_percentual) / 100) * parseFloat(primeiro.valor_unitario);
      const vlrServico = (parseFloat(primeiro.servico_percentual) / 100) * parseFloat(primeiro.valor_unitario);
      const hasPersonalizacoes = Array.isArray(primeiro.personalizacoes) && primeiro.personalizacoes.length > 0;

      let servicoSpan = "";
      if (hasPersonalizacoes) {
        const persDesc = primeiro.personalizacoes.map(p => {
          const desc = p?.descricao || p?.tipo_personalizacao || String(p);
          const pts = [];
          if (p?.cores) pts.push(`${p.cores} cor${p.cores > 1 ? "es" : ""}`);
          if (p?.posicoes) pts.push(`${p.posicoes} posição${p.posicoes > 1 ? "ões" : ""}`);
          return pts.length > 0 ? `${desc} (${pts.join(", ")})` : desc;
        }).join(" | ");
        servicoSpan = `<span><strong style="color:#7c3aed">Serviço de Personalização (${primeiro.servico_percentual}%):</strong> ${persDesc} — ${primeiro.quantidade} × R$ ${fmtMoeda(vlrServico)} = <strong>R$ ${fmtMoeda(primeiro.quantidade * vlrServico)}</strong></span>`;
      } else {
        servicoSpan = `<span><strong>Serviço (${primeiro.servico_percentual}%):</strong> ${primeiro.quantidade} × R$ ${fmtMoeda(vlrServico)} = <strong>R$ ${fmtMoeda(primeiro.quantidade * vlrServico)}</strong></span>`;
      }

      rateioRow = `
        <div style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:#374151;margin-top:${detalhesPartes.length > 0 ? "0" : "0"}px">
          <div><span><strong>Produto (${primeiro.produto_percentual}%):</strong> ${primeiro.quantidade} × R$ ${fmtMoeda(vlrProduto)} = <strong>R$ ${fmtMoeda(primeiro.quantidade * vlrProduto)}</strong></span></div>
          <div>${servicoSpan}</div>
        </div>`;
    }

    html += `
    <tr style="background:#fff">
      <td style="padding:3px 8px 10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top"></td>
      <td style="padding:3px 8px 10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top"></td>
      <td colspan="6" style="padding:3px 8px 10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">
        ${detalhesPartes.length > 0 ? `<div style="font-size:11px;color:#475569;display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">${detalhesPartes.join(`<span style="color:#e2e8f0;margin:0 2px">|</span>`)}</div>` : ""}
        ${rateioRow}
      </td>
    </tr>`;
  }

  return html;
}

/**
 * Abre janela de impressão com layout completo do orçamento.
 * @param {object} empresa - dados da empresa
 * @param {object} vendedorInfo - { nome, assinatura_url }
 */
export function gerarHTMLOrcamento({ orcamento, itens = [], extra = {}, empresa = {}, vendedorInfo = {}, clienteCompleto = null, informacoesComplementares = [], condicoesComerciais = [] }) {
  const {
    desconto = 0,
    formaPagamento = "",
    parcelas = [],
    tipoFrete = "",
    valorFrete = 0,
    subtotalItens,
    totalOrcamento,
    validadeProposta = "",
  } = extra;

  const subTotal = subtotalItens ?? itens.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
  const tipoFreteReal = tipoFrete || orcamento?.tipo_frete || "";
  const frete = tipoFreteReal === "FOB" ? (parseFloat(orcamento?.valor_frete ?? valorFrete) || 0) : 0;
  const total = totalOrcamento ?? Math.max(0, subTotal + frete - desconto);
  const validade = validadeProposta || orcamento?.validade_proposta || "";

  const codigo = orcamento?.codigo_orcamento || "—";
  const dataFmt = orcamento?.created_at
    ? format(new Date(orcamento.created_at), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");
  const validadeFmt = validade ? format(new Date(validade), "dd/MM/yyyy") : "—";

  // ── Header empresa ──────────────────────────────────────────────────────────
  const logoHTML = empresa.logo_url
    ? `<img src="${empresa.logo_url}" alt="logo" style="max-height:120px;max-width:240px;object-fit:contain;display:block" />`
    : "";

  const enderecoLinha = [empresa.endereco, empresa.numero].filter(Boolean).join(", ");
  const endLinha1Parts = [enderecoLinha, empresa.bairro].filter(Boolean);
  const endLinha1 = endLinha1Parts.join(" - ");
  const endLinha2Parts = [empresa.cep ? `CEP ${empresa.cep}` : null, empresa.cidade, empresa.estado].filter(Boolean);
  const endLinha2 = endLinha2Parts.join(" - ");

  const empresaHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #3B5CCC;padding-bottom:20px;margin-bottom:24px;gap:32px">
      <div style="flex:0 0 auto">${logoHTML}</div>
      <div style="text-align:right;line-height:1.6">
        ${empresa.razao_social ? `<div style="font-size:16px;font-weight:700;color:#1e293b">${empresa.razao_social}</div>` : ""}
        ${empresa.cnpj ? `<div style="font-size:12px;color:#475569">CNPJ: ${empresa.cnpj}</div>` : ""}
        ${endLinha1 ? `<div style="font-size:11px;color:#64748b;margin-top:4px">${endLinha1}</div>` : ""}
        ${endLinha2 ? `<div style="font-size:11px;color:#64748b">${endLinha2}</div>` : ""}
      </div>
    </div>
  `;

  // Agrupa itens pela mesma chave usada na UI: grupo_id (quando existe) ou sequencia do item principal
  // Itens do mesmo produto num orçamento compartilham grupo_id; indice=1 é o principal, >1 são sub-índices
  const gruposMap = new Map();
  const gruposOrdem = []; // preserva ordem de inserção
  itens.forEach(item => {
    // Chave de agrupamento: grupo_id se existir, senão id do próprio item (indice=1) ou produto_id+sequencia
    const chave = item.grupo_id || (item.indice === 1 || !item.indice ? item.id : null);
    if (!chave) {
      // sub-índice sem grupo_id: tenta associar ao último grupo criado com mesmo produto_id
      const ultimo = gruposOrdem[gruposOrdem.length - 1];
      if (ultimo && gruposMap.get(ultimo)[0].produto_id === item.produto_id) {
        gruposMap.get(ultimo).push(item);
        return;
      }
    }
    const k = chave || item.id;
    if (!gruposMap.has(k)) {
      gruposMap.set(k, []);
      gruposOrdem.push(k);
    }
    gruposMap.get(k).push(item);
  });

  // Renderiza grupos no PDF
  const itensHTML = gruposOrdem.map(chave => {
    const grupo = gruposMap.get(chave);
    const primeiro = grupo.find(i => (i.indice || 1) === 1) || grupo[0];
    const itemsOrdenados = [...grupo].sort((a, b) => (a.indice || 1) - (b.indice || 1));
    return renderGrupoPDF(primeiro, itemsOrdenados);
  }).join("");

  const exibirParcelas = parcelas.length >= 1 &&
    /(transferência|transferencia|boleto)/i.test(formaPagamento);

  const parcelasHTML = exibirParcelas ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
      <thead><tr style="background:#f1f5f9">
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Parcela</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Vencimento</th>
        <th style="padding:6px 8px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Valor</th>
      </tr></thead>
      <tbody>
        ${parcelas.map(p => `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#374151">${p.numero}ª</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#374151">${p.data ? format(new Date(p.data), "dd/MM/yyyy") : "—"}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#374151;text-align:right">R$ ${fmtMoeda(p.valor)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  ` : "";

  const nomeVendedor = vendedorInfo?.nome || orcamento?.vendedor || "";
  const assinaturaUrl = vendedorInfo?.assinatura_url || "";
  const assinaturaHTML = nomeVendedor ? `
    <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end">
      <div style="text-align:center;min-width:220px">
        ${assinaturaUrl ? `<img src="${assinaturaUrl}" alt="assinatura" style="max-height:60px;max-width:200px;object-fit:contain;display:block;margin:0 auto 8px auto" />` : `<div style="height:48px"></div>`}
        <div style="border-top:1px solid #1e293b;padding-top:8px;font-size:13px;color:#1e293b;font-weight:600">${nomeVendedor}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Vendedor Responsável</div>
      </div>
    </div>
  ` : "";

  return `
    <html><head><title>Orçamento ${codigo}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:32px;color:#1e293b;max-width:800px;margin:0 auto}
      @media print{body{padding:16px}}
    </style>
    </head><body>
      ${empresaHTML}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <div style="font-size:11px;font-weight:600;color:#3B5CCC;letter-spacing:0.08em;text-transform:uppercase">Orçamento</div>
          <div style="font-size:20px;font-weight:700;color:#1e293b;margin-top:2px">${codigo}</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#64748b;line-height:1.8;padding-left:32px">
          <div>Data: <strong>${dataFmt}</strong></div>
          <div>Validade: <strong>${validadeFmt}</strong></div>
        </div>
      </div>
      <div style="margin-bottom:16px;font-size:12px;color:#475569;line-height:1.8;padding:10px 14px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0">
        ${orcamento?.titulo_orcamento ? `<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px">${orcamento.titulo_orcamento}</div>` : ""}
        ${clienteCompleto ? `
          ${clienteCompleto.nome_fantasia ? `<div style="font-weight:600;color:#1e293b">${clienteCompleto.nome_fantasia}</div>` : ""}
          ${clienteCompleto.nome_cliente ? `<div>${clienteCompleto.nome_cliente}</div>` : ""}
          ${clienteCompleto.documento ? `<div>${clienteCompleto.documento}</div>` : ""}
          ${[clienteCompleto.endereco, clienteCompleto.numero].filter(Boolean).join(", ") ? `<div>${[clienteCompleto.endereco, clienteCompleto.numero].filter(Boolean).join(", ")}${clienteCompleto.complemento ? `, ${clienteCompleto.complemento}` : ""}${clienteCompleto.bairro ? ` - ${clienteCompleto.bairro}` : ""}</div>` : ""}
          ${[clienteCompleto.cep, clienteCompleto.cidade, clienteCompleto.estado].filter(Boolean).join(" — ") ? `<div>${[clienteCompleto.cep, clienteCompleto.cidade, clienteCompleto.estado].filter(Boolean).join(" — ")}</div>` : ""}
        ` : `
          ${orcamento?.cliente_nome ? `<div style="font-weight:600;color:#1e293b">${orcamento.cliente_nome}</div>` : ""}
          ${orcamento?.cliente_telefone ? `<div>${orcamento.cliente_telefone}</div>` : ""}
          ${orcamento?.cliente_email ? `<div>${orcamento.cliente_email}</div>` : ""}
        `}
      </div>
      <h3 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin-bottom:8px">Itens</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed">
       <thead><tr style="background:#f1f5f9">
         <th style="padding:8px;text-align:left;font-size:11px;width:5%">#</th>
         <th style="padding:8px;text-align:left;font-size:11px;width:9%">Qtd.</th>
         <th style="padding:8px;text-align:left;font-size:11px;width:26%">Produto / Serviço</th>
         <th style="padding:8px;text-align:left;font-size:11px;width:15%">Item / Linha</th>
         <th style="padding:8px;text-align:left;font-size:11px;width:14%">Artigo</th>
         <th style="padding:8px;text-align:left;font-size:11px;width:11%">Cor</th>
         <th style="padding:8px;text-align:right;font-size:11px;width:10%">Vlr. Unit.</th>
         <th style="padding:8px;text-align:right;font-size:11px;width:10%">Subtotal</th>
       </tr></thead>
       <tbody>${itensHTML}</tbody>
      </table>

      <div style="display:flex;gap:16px;margin-top:16px;align-items:flex-start">
        <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:#f8fafc;font-size:13px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin-bottom:6px">Pagamento${formaPagamento ? `: <span style="font-weight:700;color:#1e293b;text-transform:none;letter-spacing:normal">${formaPagamento}</span>` : ""}</div>
        ${exibirParcelas ? `<div style="margin-top:8px">${parcelasHTML}</div>` : ""}
        ${!formaPagamento ? `<div style="color:#94a3b8;font-size:12px">Não informado</div>` : ""}
        </div>
        <div style="flex:0 0 220px;border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:#f8fafc;font-size:13px">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin-bottom:8px">Resumo</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Subtotal:</span><strong>R$ ${fmtMoeda(subTotal)}</strong></div>
          ${tipoFreteReal === "FOB" ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Frete (FOB):</span><strong>R$ ${fmtMoeda(frete)}</strong></div>` : ""}
          ${tipoFreteReal === "CIF" ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Frete:</span><strong>CIF</strong></div>` : ""}
          ${desconto > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Desconto:</span><strong style="color:#dc2626">- R$ ${fmtMoeda(desconto)}</strong></div>` : ""}
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px;color:#1e40af"><span>TOTAL:</span><span>R$ ${fmtMoeda(total)}</span></div>
        </div>
      </div>
      ${gerarInformacoesHTML({ informacoesComplementares, condicoesComerciais, itens })}
      ${assinaturaHTML}
    </body></html>
  `;
}

export function imprimirOrcamento(params) {
  const html = gerarHTMLOrcamento(params);
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}