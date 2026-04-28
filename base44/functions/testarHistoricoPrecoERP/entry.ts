import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        console.log('[TESTE] Iniciando teste de inserção na tabela historico_precos_produto_erp');

        // Buscar uma empresa válida do banco
        console.log('[TESTE] Buscando empresa válida...');
        const { data: empresas, error: erroEmpresas } = await supabase
            .from('empresas')
            .select('id')
            .limit(1);

        if (erroEmpresas || !empresas || empresas.length === 0) {
            console.error('[TESTE] Erro ao buscar empresa:', erroEmpresas);
            return Response.json({ 
                status: 'error', 
                message: 'Nenhuma empresa encontrada no banco',
                error: erroEmpresas?.message 
            }, { status: 200 });
        }

        const empresaId = empresas[0].id;
        console.log('[TESTE] Empresa encontrada:', empresaId);

        const { data, error } = await supabase
            .from('historico_precos_produto_erp')
            .insert({
                empresa_id: empresaId,
                codigo_unico: "TESTE123",
                codigo_produto: "PROD_TESTE",
                descricao_original: "Produto Teste",
                fornecedor_nome: "Fornecedor Teste",
                chave_danfe: "12345678901234567890123456789012345678901234",
                numero_nf: "999999",
                numero_item: 1,
                data_emissao: new Date().toISOString(),
                valor_unitario: 10.5,
                quantidade: 2,
                valor_total: 21,
                unidade: "UN",
                dados_danfe: { teste: true }
            });

        if (error) {
            console.error('[TESTE] ERRO INSERT:', error);
            return Response.json({ 
                status: 'error', 
                message: 'Erro ao inserir',
                error: error.message 
            }, { status: 200 });
        } else {
            console.log('[TESTE] SUCESSO INSERT:', data);
            return Response.json({ 
                status: 'success', 
                message: 'Inserção bem-sucedida',
                data: data 
            }, { status: 200 });
        }

    } catch (err) {
        console.error('[TESTE] ERRO GERAL:', err);
        return Response.json({ 
            status: 'error', 
            message: 'Erro geral na função',
            error: err.message 
        }, { status: 200 });
    }
});