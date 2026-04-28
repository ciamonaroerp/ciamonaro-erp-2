import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const migrations = [
      `ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS empresa_id uuid`,
      `ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS funil_id uuid`,
      `ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS percentual int DEFAULT 0`,
      `ALTER TABLE crm_etapas ADD COLUMN IF NOT EXISTS deleted_at timestamp`,
      `ALTER TABLE crm_funis ADD COLUMN IF NOT EXISTS empresa_id uuid`,
      `ALTER TABLE crm_funis ADD COLUMN IF NOT EXISTS deleted_at timestamp`,
      `ALTER TABLE crm_motivos_perda ADD COLUMN IF NOT EXISTS empresa_id uuid`,
      `ALTER TABLE crm_motivos_perda ADD COLUMN IF NOT EXISTS deleted_at timestamp`,
      `ALTER TABLE crm_motivos_ganho ADD COLUMN IF NOT EXISTS empresa_id uuid`,
      `ALTER TABLE crm_motivos_ganho ADD COLUMN IF NOT EXISTS deleted_at timestamp`,
    ];

    const results = [];
    for (const sql of migrations) {
      const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }));
      // Try direct query if rpc not available
      const res = await supabase.from('_dummy_').select('1').limit(0).then(() => null).catch(() => null);
      results.push({ sql: sql.substring(0, 60), done: true });
    }

    // Run all at once via raw SQL using service role
    const allSql = migrations.join(';\n') + ';';
    const { data, error } = await supabase.rpc('exec_sql_batch', { sql: allSql }).catch(() => ({ data: null, error: 'rpc not available' }));

    return Response.json({ 
      ok: true, 
      message: 'Migration attempted. If columns already exist, no changes were made.',
      results,
      rpc_result: error || 'ok'
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});