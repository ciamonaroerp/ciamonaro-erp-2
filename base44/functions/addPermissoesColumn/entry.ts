/**
 * Adiciona coluna permissoes (jsonb) à tabela erp_usuarios, se não existir.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get("VITE_SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verifica se coluna já existe
    const { data: cols } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'erp_usuarios')
      .eq('column_name', 'permissoes');

    if (cols && cols.length > 0) {
      return Response.json({ success: true, message: 'Coluna permissoes já existe.' });
    }

    // Tenta adicionar via RPC
    const sql = `ALTER TABLE erp_usuarios ADD COLUMN IF NOT EXISTS permissoes jsonb DEFAULT '[]'::jsonb;`;
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      return Response.json({
        success: false,
        message: 'Execute este SQL manualmente no Supabase SQL Editor:',
        sql,
        error: error.message,
      });
    }

    return Response.json({ success: true, message: 'Coluna permissoes adicionada com sucesso.' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});