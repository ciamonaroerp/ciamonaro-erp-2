import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        console.log('[DIAG] Buscando schema da tabela');

        // Buscar informações sobre a tabela
        const { data: tableInfo, error: tableError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .eq('table_name', 'historico_precos_produto_erp');

        if (tableError) {
            console.log('[DIAG] Erro ao buscar tabela em information_schema:', tableError);
        } else {
            console.log('[DIAG] Tabela encontrada:', tableInfo);
        }

        // Tentar SELECT simples
        const { data: selectData, error: selectError } = await supabase
            .from('historico_precos_produto_erp')
            .select('*')
            .limit(1);

        if (selectError) {
            console.log('[DIAG] SELECT error:', selectError);
        } else {
            console.log('[DIAG] SELECT sucesso:', selectData);
        }

        // Tentar INSERT com campos obrigatórios
        const { data: insertData, error: insertError } = await supabase
            .from('historico_precos_produto_erp')
            .insert([{
                empresa_id: '73045062-97e0-43b5-b95d-a1be96b4a0f2',
                chave_danfe: 'TEST-001',
                valor_unitario: 100.00,
                codigo_produto: 'SKU-001',
                numero_item: 1
            }]);

        if (insertError) {
            console.error('[DIAG] INSERT error:', insertError);
            return Response.json({ 
                status: 'insert_error',
                error: insertError
            }, { status: 200 });
        }

        console.log('[DIAG] INSERT sucesso:', insertData);
        return Response.json({ 
            status: 'success',
            data: insertData
        }, { status: 200 });

    } catch (err) {
        console.error('[DIAG] Exception:', err.message);
        return Response.json({ 
            status: 'exception',
            error: err.message
        }, { status: 200 });
    }
});