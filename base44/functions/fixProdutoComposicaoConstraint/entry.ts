import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Drop old constraint and recreate with variavel_index included
    const sql = `
      ALTER TABLE produto_composicao DROP CONSTRAINT IF EXISTS unique_produto_composicao;
      ALTER TABLE produto_composicao ADD CONSTRAINT unique_produto_composicao 
        UNIQUE (produto_id, rendimento_id, variavel_index);
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Try alternative approach using raw query
      const r1 = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE produto_composicao DROP CONSTRAINT IF EXISTS unique_produto_composicao;' });
      const r2 = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE produto_composicao ADD CONSTRAINT unique_produto_composicao UNIQUE (produto_id, rendimento_id, variavel_index);' });
      return Response.json({ r1: r1.error?.message, r2: r2.error?.message, note: 'tried separately' });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});