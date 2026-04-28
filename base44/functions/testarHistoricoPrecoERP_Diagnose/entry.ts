import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        console.log('[DIAGNOSE] Verificando RLS na tabela historico_precos_produto_erp');

        // Buscar empresa
        const { data: empresas, error: erroEmpresas } = await supabase
            .from('empresas')
            .select('id')
            .limit(1);

        if (erroEmpresas || !empresas || empresas.length === 0) {
            console.error('[DIAGNOSE] Erro ao buscar empresa:', erroEmpresas?.message);
            return Response.json({ 
                status: 'error', 
                message: 'Nenhuma empresa encontrada',
                error: erroEmpresas?.message 
            }, { status: 200 });
        }

        const empresaId = empresas[0].id;
        console.log('[DIAGNOSE] Empresa encontrada:', empresaId);

        // Tentar inserir
        const { data, error } = await supabase
            .from('historico_precos_produto_erp')
            .insert({
                empresa_id: empresaId,
                codigo_unico: "TESTE_DIAGNOSE",
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
            console.error('[DIAGNOSE] ERRO INSERT:', JSON.stringify(error));
            return Response.json({ 
                status: 'error', 
                message: 'Erro ao inserir',
                error: error
            }, { status: 200 });
        } else {
            console.log('[DIAGNOSE] SUCESSO INSERT:', data);
            return Response.json({ 
                status: 'success', 
                message: 'Inserção bem-sucedida',
                data: data 
            }, { status: 200 });
        }

    } catch (err) {
        console.error('[DIAGNOSE] ERRO GERAL:', err.message, err.stack);
        return Response.json({ 
            status: 'error', 
            message: 'Erro geral',
            error: err.message 
        }, { status: 200 });
    }
});