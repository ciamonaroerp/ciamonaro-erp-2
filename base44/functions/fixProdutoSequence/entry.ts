import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Grant sequence permission and also remove sequence default from codigo column
    const sqls = [
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role`,
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated`,
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon`,
      // Remove the sequence default from codigo so we can insert our own value freely
      `ALTER TABLE produto_comercial ALTER COLUMN codigo DROP DEFAULT`,
    ];

    const results = [];
    for (const sql of sqls) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();
      if (error) {
        // Try direct query as fallback
        const { error: e2 } = await supabase.from('_dummy_').select('*').limit(0);
        results.push({ sql: sql.substring(0, 50), status: 'tried', note: error.message });
      } else {
        results.push({ sql: sql.substring(0, 50), status: 'ok' });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});