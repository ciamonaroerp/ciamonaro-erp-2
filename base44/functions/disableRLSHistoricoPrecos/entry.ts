import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        console.log('[ADMIN] Desabilitando RLS na tabela historico_precos_produto_erp');

        // Executar SQL admin para desabilitar RLS
        const { data, error } = await supabase.sql`
            ALTER TABLE historico_precos_produto_erp DISABLE ROW LEVEL SECURITY;
        `;

        if (error) {
            console.error('[ADMIN] Erro ao desabilitar RLS:', error);
            return Response.json({ 
                status: 'error', 
                message: 'Erro ao desabilitar RLS',
                error: error.message 
            }, { status: 200 });
        }

        console.log('[ADMIN] RLS desabilitada com sucesso');
        return Response.json({ 
            status: 'success', 
            message: 'RLS desabilitada'
        }, { status: 200 });

    } catch (err) {
        console.error('[ADMIN] ERRO:', err.message);
        return Response.json({ 
            status: 'error', 
            message: 'Erro ao executar',
            error: err.message 
        }, { status: 200 });
    }
});