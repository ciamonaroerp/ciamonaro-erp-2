export function parseXmlNFe(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const get = (selector) => doc.querySelector(selector)?.textContent?.trim() || "";

    // Identificação
    const chave = get("chNFe") || (get("infNFe")?.getAttribute?.("Id") || "").replace("NFe", "");
    const numero = get("nNF");
    const serie = get("serie");
    const data_emissao = get("dhEmi") || get("dEmi");
    const data_entrada_saida = get("dhSaiEnt") || get("dSaiEnt");
    const valor_total = parseFloat(get("vNF") || "0");

    // Emitente
    const emitente_cnpj = get("emit CNPJ");
    const emitente_nome = get("emit xNome") || get("emit xFant");
    const emitente_ie = get("emit IE");
    const emitente_logr = get("emit enderEmit xLgr");
    const emitente_nro = get("emit enderEmit nro");
    const emitente_bairro = get("emit enderEmit xBairro");
    const emitente_mun = get("emit enderEmit xMun");
    const emitente_uf = get("emit enderEmit UF");
    const emitente_cep = get("emit enderEmit CEP");
    const emitente_endereco = [emitente_logr, emitente_nro, emitente_bairro, emitente_mun, emitente_uf, emitente_cep].filter(Boolean).join(", ");

    // Destinatário
    const destinatario_documento = get("dest CNPJ") || get("dest CPF");
    const destinatario_nome = get("dest xNome");
    const destinatario_ie = get("dest IE");
    const dest_logr = get("dest enderDest xLgr");
    const dest_nro = get("dest enderDest nro");
    const dest_bairro = get("dest enderDest xBairro");
    const dest_mun = get("dest enderDest xMun");
    const dest_uf = get("dest enderDest UF");
    const dest_cep = get("dest enderDest CEP");
    const destinatario_endereco = [dest_logr, dest_nro, dest_bairro, dest_mun, dest_uf, dest_cep].filter(Boolean).join(", ");

    // Itens
    const dets = doc.querySelectorAll("det");
    const itens = Array.from(dets).map(det => {
      const g = (tag) => det.querySelector(tag)?.textContent?.trim() || "";

      const xProd = g("xProd");
      const infAdProd = g("infAdProd");
      const xPed = g("xPed");

      // pRedBC pode estar em diferentes nós ICMS
      let pRedBC = "";
      const icmsNode = det.querySelector("ICMS");
      if (icmsNode) {
        const pRedNode = icmsNode.querySelector("pRedBC");
        if (pRedNode) pRedBC = pRedNode.textContent.trim();
      }

      // Montagem da descrição completa (igual DANFE)
      let descricaoCompleta = xProd;
      if (infAdProd) descricaoCompleta += "\n" + infAdProd;
      if (pRedBC) descricaoCompleta += "\n" + "pRedBC=" + pRedBC + "%";

      return {
        codigo: g("cProd"),
        descricao: descricaoCompleta,
        descricao_base: xProd,
        descricao_complementar: infAdProd,
        codigo_pedido: xPed,
        percentual_reducao_bc: pRedBC,
        ncm: g("NCM"),
        cfop: g("CFOP"),
        unidade: g("uCom"),
        quantidade: parseFloat(g("qCom") || "0"),
        valor_unitario: parseFloat(g("vUnCom") || "0"),
        valor_total: parseFloat(g("vProd") || "0"),
        icms: parseFloat(det.querySelector("vICMS")?.textContent || "0"),
        ipi: parseFloat(det.querySelector("vIPI")?.textContent || "0"),
        pis: parseFloat(det.querySelector("vPIS")?.textContent || "0"),
        cofins: parseFloat(det.querySelector("vCOFINS")?.textContent || "0"),
      };
    });

    // Impostos totais
    const impostos = {
      icms: parseFloat(get("vICMS") || "0"),
      ipi: parseFloat(get("vIPI") || "0"),
      pis: parseFloat(get("vPIS") || "0"),
      cofins: parseFloat(get("vCOFINS") || "0"),
    };

    // Duplicatas
    const dups = doc.querySelectorAll("dup");
    const duplicatas = Array.from(dups).map(dup => ({
      numero: dup.querySelector("nDup")?.textContent?.trim() || "",
      vencimento: dup.querySelector("dVenc")?.textContent?.trim() || "",
      valor: parseFloat(dup.querySelector("vDup")?.textContent || "0"),
    }));

    return {
      ok: true,
      chave,
      numero,
      serie,
      data_emissao,
      data_entrada_saida,
      valor_total,
      emitente_cnpj,
      emitente_nome,
      emitente_ie,
      emitente_endereco,
      destinatario_documento,
      destinatario_nome,
      destinatario_ie,
      destinatario_endereco,
      itens,
      duplicatas,
      impostos,
    };
  } catch {
    return { ok: false };
  }
}