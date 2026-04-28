import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    try {
        const reqForSdk = req.clone();
        console.log('[registrarHistoricoPrecoERP] Função iniciada');;
        
        const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        const { item, vinculo, contexto } = await req.json();
        const base44 = createClientFromRequest(reqForSdk);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        console.log('[registrarHistoricoPrecoERP] Payload recebido:', {
            item: item ? { codigo_produto: item.codigo_produto, valor_unitario: item.valor_unitario } : null,
            vinculo: vinculo ? { codigo_unico: vinculo.codigo_unico } : null,
            contexto: contexto ? { empresa_id: contexto.empresa_id, chave_danfe: contexto.chave_danfe } : null
        });

        // Validar dados mínimos
        if (!contexto?.empresa_id || !contexto?.chave_danfe || item?.valor_unitario === undefined) {
            console.warn('[registrarHistoricoPrecoERP] Dados insuficientes para registrar', { item, vinculo, contexto });
            return Response.json({ status: 'ignored', message: 'Dados insuficientes' }, { status: 200 });
        }

        // Verificar se já existe registro para essa chave+item (evitar duplicata em reimportação)
        const { data: existente } = await supabase
            .from('historico_precos_produto_erp')
            .select('id')
            .eq('empresa_id', contexto.empresa_id)
            .eq('chave_danfe', contexto.chave_danfe)
            .eq('numero_item', Number(item.numero_item || 0))
            .maybeSingle();

        const registroHistorico = {
                empresa_id: contexto.empresa_id,
                codigo_unico: vinculo?.codigo_unico || null,
                codigo_produto: item.codigo_produto || null,
                descricao_original: item.descricao || null,
                descricao_base: item.descricao_base || null,
                descricao_complementar: item.descricao_complementar || null,
                fornecedor_nome: contexto.fornecedor || null,
                chave_danfe: contexto.chave_danfe,
                numero_nf: contexto.numero_nf || null,
                numero_item: Number(item.numero_item || 0),
                data_emissao: contexto.data_emissao || null,
                valor_unitario: Number(item.valor_unitario || 0),
                quantidade: Number(item.quantidade || 0),
                valor_total: Number(item.valor_total || 0),
                unidade: item.unidade || null,
                dados_danfe: item,
        };

        let dbError;
        if (existente) {
            const { error } = await supabase
                .from('historico_precos_produto_erp')
                .update(registroHistorico)
                .eq('id', existente.id);
            dbError = error;
        } else {
            const { error } = await supabase
                .from('historico_precos_produto_erp')
                .insert(registroHistorico);
            dbError = error;
        }

        if (dbError) {
            const error = dbError;
            console.error('[registrarHistoricoPrecoERP] ERRO ao inserir na tabela:', error);
            return Response.json({ status: 'error', message: error.message }, { status: 200 });
        }

        // Atualizar cache do último preço (sem bloquear resposta)
        if (vinculo?.codigo_unico && item?.valor_unitario) {
            supabase.from('ultimo_preco_produto').select('id, data_ultima_nf')
                .eq('codigo_unico', vinculo.codigo_unico)
                .eq('empresa_id', contexto.empresa_id)
                .single()
                .then(({ data: existente }) => {
                    const agora = new Date().toISOString();
                    const dataNova = contexto.data_emissao ? new Date(contexto.data_emissao) : new Date();
                    const dataExistente = existente?.data_ultima_nf ? new Date(existente.data_ultima_nf) : new Date(0);

                    if (!existente) {
                        supabase.from('ultimo_preco_produto').insert({
                            codigo_unico: vinculo.codigo_unico,
                            empresa_id: contexto.empresa_id,
                            ultimo_preco: Number(item.valor_unitario),
                            data_ultima_nf: contexto.data_emissao || agora,
                            fornecedor_nome: contexto.fornecedor || null,
                            numero_nf: contexto.numero_nf || null,
                            updated_at: agora
                        }).then(({ error: e }) => e && console.warn('[cache] insert warn:', e.message));
                    } else if (dataNova > dataExistente) {
                        supabase.from('ultimo_preco_produto').update({
                            ultimo_preco: Number(item.valor_unitario),
                            data_ultima_nf: contexto.data_emissao || agora,
                            fornecedor_nome: contexto.fornecedor || null,
                            numero_nf: contexto.numero_nf || null,
                            updated_at: agora
                        }).eq('id', existente.id)
                        .then(({ error: e }) => e && console.warn('[cache] update warn:', e.message));
                    }
                });
        }

        console.log('[registrarHistoricoPrecoERP] SUCESSO - Registro inserido', {
            empresa_id: contexto.empresa_id,
            chave_danfe: contexto.chave_danfe,
            codigo_unico: vinculo?.codigo_unico
        });
        return Response.json({ status: 'success' }, { status: 200 });

    } catch (err) {
        console.error('[registrarHistoricoPrecoERP] ERRO INESPERADO:', err);
        return Response.json({ status: 'error', message: err.message }, { status: 200 });
    }
});