import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

async function sistemaLog({ empresa_id, usuario_email, modulo, acao, mensagem_erro, dados_erro }) {
  try {
    await supabaseAdmin.from('sistema_logs').insert({
      empresa_id: empresa_id || null,
      usuario_email: usuario_email || null,
      modulo: modulo || 'Fiscal',
      acao: acao || null,
      mensagem_erro: mensagem_erro || null,
      dados_erro: dados_erro ? JSON.stringify(dados_erro) : null,
      nivel: 'ERROR',
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('[sistema_logs] Falha:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, empresa_id, payload, id } = body;

    if (!action) return Response.json({ error: 'action é obrigatório' }, { status: 400 });

    if (action === 'list') {
      try {
        const { data, error } = await supabaseAdmin
          .from('nota_fiscal_importada')
          .select('*')
          .eq('empresa_id', empresa_id)
          .is('deleted_at', null)
          .order('created_date', { ascending: false });
        if (error) {
          if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
            return Response.json({ data: [] });
          }
          await sistemaLog({ empresa_id, usuario_email: user.email, modulo: 'Fiscal', acao: 'SELECT', mensagem_erro: error.message, dados_erro: { code: error.code } });
          throw error;
        }
        return Response.json({ data });
      } catch (e) {
        console.error('[fiscalCRUD] Erro ao listar:', e.message);
        if (e.message?.includes('Could not find the table') || e.message?.includes('PGRST205')) {
          return Response.json({ data: [] });
        }
        throw e;
      }
    }

    if (action === 'insert') {
      const dateFields = ['data_emissao', 'data_entrada_saida'];
      const sanitized = { ...payload };
      for (const f of dateFields) {
        if (!sanitized[f] || sanitized[f].trim() === '') sanitized[f] = null;
        else sanitized[f] = sanitized[f].substring(0, 10);
      }

      const { data: vinculos } = await supabaseAdmin
        .from('config_vinculos')
        .select('codigo_unico, descricao_base, descricao_complementar, descricao_unificada, descricao_comercial_unificada, artigo_nome_comercial, cor_nome_comercial, fornecedor_id')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .not('artigo_nome_comercial', 'is', null);

      const { data: notasHistorico } = await supabaseAdmin
        .from('nota_fiscal_importada')
        .select('itens, emitente_cnpj')
        .eq('empresa_id', empresa_id);

      const mapaHistoricoBase = {};
      const normCNPJHist = (s) => (s || '').replace(/\D/g, '');
      for (const nota of (notasHistorico || [])) {
        let itensNota;
        try { itensNota = typeof nota.itens === 'string' ? JSON.parse(nota.itens) : nota.itens; } catch { continue; }
        if (!Array.isArray(itensNota)) continue;
        for (const it of itensNota) {
          if (!it.codigo_unico || it.status_vinculo !== 'vinculado') continue;
          const chaveBase = `base:${it.descricao_base || ''}|fornecedor:${normCNPJHist(nota.emitente_cnpj)}`;
          if (!mapaHistoricoBase[chaveBase]) mapaHistoricoBase[chaveBase] = it.codigo_unico;
        }
      }

      console.log(`[Fiscal Vínculo] config_vinculos carregados: ${(vinculos || []).length}`);

      const normCNPJ = (s) => (s || '').replace(/\D/g, '');
      const emitenteCnpjNorm = normCNPJ(sanitized.emitente_cnpj);

      const itensRaw = sanitized.itens;
      const itensArray = Array.isArray(itensRaw)
        ? itensRaw
        : (typeof itensRaw === 'string' ? (() => { try { return JSON.parse(itensRaw); } catch { return []; } })() : []);
      console.log(`[Fiscal Diagnóstico] itens recebidos: ${itensArray.length} | tipo: ${typeof itensRaw} | isArray: ${Array.isArray(itensRaw)}`);
      itensArray.forEach((it, i) => console.log(`[Fiscal Diagnóstico] item[${i}]: descricao_base="${it.descricao_base}" codigo_unico="${it.codigo_unico || 'N/A'}"`));
      sanitized.itens = itensArray;

      if (Array.isArray(sanitized.itens)) {
        const itensProcessados = [];
        for (const item of sanitized.itens) {
          if (item.codigo_unico) {
            console.log(`[Fiscal Vínculo] MANTIDO (já vinculado): "${item.descricao_base}" → ${item.codigo_unico}`);
            itensProcessados.push(item);
            continue;
          }

          const itemDescCompl = (item.descricao_complementar || '').toLowerCase().trim();
          const itemDescBase = (item.descricao_base || '').toLowerCase().trim();

          if (itemDescCompl && itemDescBase) {
            const matchExato = (vinculos || []).filter(v => {
              if (!v.descricao_complementar || !v.descricao_base) return false;
              return v.descricao_complementar.toLowerCase().trim() === itemDescCompl
                && v.descricao_base.toLowerCase().trim() === itemDescBase;
            });

            if (matchExato.length === 1) {
              const match = matchExato[0];
              const codigo_unico = match.codigo_unico;
              console.log(`[Fiscal Vínculo] Vinculado (desc_compl + desc_base exato): "${item.descricao_base}" → ${codigo_unico}`);
              
              const dataAtualizado = {
                descricao_base: item.descricao_base || match.descricao_base,
                descricao_complementar: item.descricao_complementar || match.descricao_complementar,
                descricao_unificada: item.descricao_unificada || match.descricao_unificada,
                fornecedor_id: item.fornecedor_id || match.fornecedor_id,
              };
              
              const { error: updateError } = await supabaseAdmin
                .from('config_vinculos')
                .update(dataAtualizado)
                .eq('codigo_unico', codigo_unico)
                .eq('empresa_id', empresa_id);
              if (updateError) {
                console.error(`[Fiscal Vínculo] Erro ao atualizar config_vinculos:`, updateError.message);
              } else {
                console.log(`[Fiscal Vínculo] config_vinculos atualizado:`, JSON.stringify(dataAtualizado));
              }
              
              itensProcessados.push({ 
                ...item, 
                codigo_unico, 
                status_vinculo: 'vinculado',
                descricao_base: dataAtualizado.descricao_base,
                descricao_complementar: dataAtualizado.descricao_complementar,
                descricao_unificada: dataAtualizado.descricao_unificada,
                fornecedor_id: dataAtualizado.fornecedor_id,
              });
              continue;
              }

              if (matchExato.length > 1) {
              console.log(`[Fiscal Vínculo] PENDENTE (múltiplos matches por desc_compl+base): "${item.descricao_base}" (${matchExato.length} códigos)`);
              itensProcessados.push({ ...item, status_vinculo: 'pendente_de_vinculo' });
              continue;
              }
              }

          if (itemDescBase) {
            const matchBase = (vinculos || []).filter(v => {
              if (v.fornecedor_id && normCNPJ(v.fornecedor_id) !== emitenteCnpjNorm) return false;
              if (!v.descricao_base) return false;
              return v.descricao_base.toLowerCase().trim() === itemDescBase;
            });

            if (matchBase.length === 1) {
              const match = matchBase[0];
              const codigo_unico = match.codigo_unico;
              console.log(`[Fiscal Vínculo] Vinculado (descricao_base exato): "${item.descricao_base}" → ${codigo_unico}`);
              
              const dataAtualizado = {
                descricao_base: item.descricao_base || match.descricao_base,
                descricao_complementar: item.descricao_complementar || match.descricao_complementar,
                descricao_unificada: item.descricao_unificada || match.descricao_unificada,
                fornecedor_id: item.fornecedor_id || match.fornecedor_id,
              };
              
              const { error: updateError } = await supabaseAdmin
                .from('config_vinculos')
                .update(dataAtualizado)
                .eq('codigo_unico', codigo_unico)
                .eq('empresa_id', empresa_id);
              if (updateError) {
                console.error(`[Fiscal Vínculo] Erro ao atualizar config_vinculos:`, updateError.message);
              } else {
                console.log(`[Fiscal Vínculo] config_vinculos atualizado:`, JSON.stringify(dataAtualizado));
              }
              
              itensProcessados.push({ 
                ...item, 
                codigo_unico, 
                status_vinculo: 'vinculado',
                descricao_base: dataAtualizado.descricao_base,
                descricao_complementar: dataAtualizado.descricao_complementar,
                descricao_unificada: dataAtualizado.descricao_unificada,
                fornecedor_id: dataAtualizado.fornecedor_id,
              });
              continue;
            }

            if (matchBase.length > 1) {
              console.log(`[Fiscal Vínculo] PENDENTE (múltiplos matches por desc_base): "${item.descricao_base}" (${matchBase.length} códigos)`);
              itensProcessados.push({ ...item, status_vinculo: 'pendente_de_vinculo' });
              continue;
            }
          }

          const chaveHistorico = `base:${item.descricao_base || ''}|fornecedor:${emitenteCnpjNorm}`;
          if (mapaHistoricoBase[chaveHistorico]) {
             const codigoUnico = mapaHistoricoBase[chaveHistorico];
             console.log(`[Fiscal Vínculo] Vinculado (histórico): "${item.descricao_base}" → ${codigoUnico}`);

             // Buscar a config existente para preservar dados válidos
             const matchHistorico = (vinculos || []).find(v => v.codigo_unico === codigoUnico);

             const dataAtualizado = {
               descricao_base: (item.descricao_base && item.descricao_base.trim()) ? item.descricao_base : (matchHistorico?.descricao_base || null),
               descricao_complementar: (item.descricao_complementar && item.descricao_complementar.trim()) ? item.descricao_complementar : (matchHistorico?.descricao_complementar || null),
               descricao_unificada: (item.descricao_unificada && item.descricao_unificada.trim()) ? item.descricao_unificada : (matchHistorico?.descricao_unificada || null),
               fornecedor_id: (item.fornecedor_id && item.fornecedor_id.trim()) ? item.fornecedor_id : (matchHistorico?.fornecedor_id || null),
             };

             // Só atualizar se houver dados novos válidos a adicionar
             const temDadosNovos = Object.values(dataAtualizado).some(v => v !== null);
             if (temDadosNovos) {
               const { error: updateError } = await supabaseAdmin
                 .from('config_vinculos')
                 .update(dataAtualizado)
                 .eq('codigo_unico', codigoUnico)
                 .eq('empresa_id', empresa_id);
               if (updateError) {
                 console.error(`[Fiscal Vínculo] Erro ao atualizar config_vinculos (histórico):`, updateError.message);
               } else {
                 console.log(`[Fiscal Vínculo] config_vinculos atualizado (histórico):`, JSON.stringify(dataAtualizado));
               }
             } else {
               console.log(`[Fiscal Vínculo] config_vinculos: nenhum dado novo válido para atualizar (histórico)`);
             }
             itensProcessados.push({ 
               ...item, 
               codigo_unico: codigoUnico, 
               status_vinculo: 'vinculado',
               descricao_base: dataAtualizado.descricao_base,
               descricao_complementar: dataAtualizado.descricao_complementar,
               descricao_unificada: dataAtualizado.descricao_unificada,
               fornecedor_id: dataAtualizado.fornecedor_id,
             });
             continue;
          }
          
          console.log(`[Fiscal Vínculo] PENDENTE: "${item.descricao_complementar || ''}" / "${item.descricao_base}" (fornecedor: ${emitenteCnpjNorm})`);
          itensProcessados.push({ ...item, status_vinculo: 'pendente_de_vinculo' });
        }
        sanitized.itens = itensProcessados;
      }

      if (Array.isArray(sanitized.itens)) {
        sanitized.itens = JSON.stringify(sanitized.itens);
      }

      const firstItem = (Array.isArray(sanitized.itens) ? sanitized.itens[0] : null) || 
                       (typeof sanitized.itens === 'string' ? (() => { try { return JSON.parse(sanitized.itens)[0]; } catch { return null; } })() : null);
      
      // Validar e limpar campos numéricos
      const sanitizeNumeric = (val) => {
        if (val === null || val === undefined || val === '') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };
      
      // Sanitizar todos os campos numéricos do sanitized também
      const numericFields = [
        'valor_total_nf', 'valor_desconto', 'valor_frete', 'valor_seguro',
        'valor_icms', 'valor_ipi', 'valor_pis', 'valor_cofins',
        'valor_base_calculo_icms', 'valor_base_calculo_pis', 'valor_base_calculo_cofins',
        'aliquota_icms', 'aliquota_ipi', 'aliquota_pis', 'aliquota_cofins',
        'quantidade', 'valor_unitario', 'valor_total_item', 'percentual_reducao_bc'
      ];
      
      const sanitized_numeric = { ...sanitized };
      for (const field of numericFields) {
        if (field in sanitized_numeric) {
          sanitized_numeric[field] = sanitizeNumeric(sanitized_numeric[field]);
        }
      }
      
      const toInsert = {
        ...sanitized_numeric,
        empresa_id,
        descricao_base: (firstItem?.descricao_base && String(firstItem.descricao_base).trim()) ? firstItem.descricao_base : null,
        descricao_complementar: (firstItem?.descricao_complementar && String(firstItem.descricao_complementar).trim()) ? firstItem.descricao_complementar : null,
        descricao_unificada: (firstItem?.descricao_unificada && String(firstItem.descricao_unificada).trim()) ? firstItem.descricao_unificada : null,
        fornecedor_id: (firstItem?.fornecedor_id && String(firstItem.fornecedor_id).trim()) ? firstItem.fornecedor_id : null,
        codigo_pedido: (firstItem?.codigo_pedido && String(firstItem.codigo_pedido).trim()) ? firstItem.codigo_pedido : null,
        percentual_reducao_bc: sanitizeNumeric(firstItem?.percentual_reducao_bc),
        codigo_unico: (firstItem?.codigo_unico && String(firstItem.codigo_unico).trim()) ? firstItem.codigo_unico : null,
        status_vinculo: (firstItem?.status_vinculo && String(firstItem.status_vinculo).trim()) ? firstItem.status_vinculo : null,
      };
      console.log(`[Fiscal Insert] Preparando insert com firstItem:`, JSON.stringify(firstItem, null, 2));
      console.log(`[Fiscal Insert] toInsert final:`, JSON.stringify({ 
        descricao_base: toInsert.descricao_base, 
        descricao_complementar: toInsert.descricao_complementar, 
        descricao_unificada: toInsert.descricao_unificada,
        fornecedor_id: toInsert.fornecedor_id,
        codigo_unico: toInsert.codigo_unico,
        status_vinculo: toInsert.status_vinculo
      }, null, 2));

      const { data, error } = await supabaseAdmin
        .from('nota_fiscal_importada')
        .insert(toInsert)
        .select()
        .single();
      if (error) {
        await sistemaLog({ empresa_id, usuario_email: user.email, modulo: 'Fiscal', acao: 'INSERT', mensagem_erro: error.message, dados_erro: { code: error.code, details: error.details } });
        throw error;
      }
      return Response.json({ data });
    }

    if (action === 'update') {
      const { data, error } = await supabaseAdmin
        .from('nota_fiscal_importada')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        await sistemaLog({ empresa_id, usuario_email: user.email, modulo: 'Fiscal', acao: 'UPDATE', mensagem_erro: error.message, dados_erro: { code: error.code, id } });
        throw error;
      }
      return Response.json({ data });
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin
        .from('nota_fiscal_importada')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        await sistemaLog({ empresa_id, usuario_email: user.email, modulo: 'Fiscal', acao: 'DELETE', mensagem_erro: error.message, dados_erro: { code: error.code, id } });
        throw error;
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'action inválida' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});