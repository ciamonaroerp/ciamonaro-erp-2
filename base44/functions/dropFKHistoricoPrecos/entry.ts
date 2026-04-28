import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    try {
        const reqForSdk = req.clone();
        const body = await req.json();
        const base44 = createClientFromRequest(reqForSdk);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const supabase = createClient(
            Deno.env.get('VITE_SUPABASE_URL'),
            Deno.env.get('SUPABASE_SERVICE_KEY'),
            { auth: { persistSession: false } }
        );

        // Lista as FK constraints na tabela
        const { data: constraints, error: listErr } = await supabase.rpc('exec_sql', {
            sql: `
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'historico_precos_produto_erp'::regclass
                  AND contype = 'f';
            `
        });

        if (listErr) {
            // Tenta direto via SQL bruto
            const { error: dropErr } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE historico_precos_produto_erp DROP CONSTRAINT IF EXISTS fk_empresa_erp;`
            });
            if (dropErr) {
                return Response.json({ error: dropErr.message, hint: 'Execute manualmente no SQL Editor do Supabase: ALTER TABLE historico_precos_produto_erp DROP CONSTRAINT IF EXISTS fk_empresa_erp;' }, { status: 200 });
            }
            return Response.json({ success: true, message: 'FK fk_empresa_erp removida com sucesso.' });
        }

        const { error: dropErr } = await supabase.rpc('exec_sql', {
            sql: `ALTER TABLE historico_precos_produto_erp DROP CONSTRAINT IF EXISTS fk_empresa_erp;`
        });

        if (dropErr) {
            return Response.json({
                error: dropErr.message,
                constraints,
                hint: 'Execute manualmente no SQL Editor do Supabase: ALTER TABLE historico_precos_produto_erp DROP CONSTRAINT IF EXISTS fk_empresa_erp;'
            }, { status: 200 });
        }

        return Response.json({ success: true, message: 'FK fk_empresa_erp removida. Histórico de preços agora funcionará corretamente.' });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});