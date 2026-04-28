import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only admin can execute this
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const sql = `ALTER TABLE IF EXISTS produto_comercial ADD COLUMN IF NOT EXISTS num_variaveis INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_produto_comercial_num_variaveis ON produto_comercial(num_variaveis);`;

    // Test if table exists
    const { data, error } = await supabase
      .from('produto_comercial')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      return Response.json({
        error: 'Table produto_comercial does not exist',
        sql: sql
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: 'Execute this SQL in Supabase SQL Editor (Dashboard → SQL Editor → New Query)',
      sql: sql
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});