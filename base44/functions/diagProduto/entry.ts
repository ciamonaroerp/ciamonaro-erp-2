import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

    const results = {};

    // 1. Check table info via REST API
    const tableRes = await fetch(
      `${supabaseUrl}/rest/v1/produto_comercial?limit=0`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Accept': 'application/json',
        }
      }
    );
    results.rest_direct_status = tableRes.status;
    results.rest_direct_headers = Object.fromEntries(tableRes.headers.entries());
    if (!tableRes.ok) {
      results.rest_direct_error = await tableRes.json();
    } else {
      results.rest_direct_ok = true;
    }

    // 2. Try via pg meta endpoint
    const pgRes = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/tables`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
        }
      }
    );
    results.pg_meta_status = pgRes.status;

    // 3. Check RLS policies via supabase-js
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Try with no RLS bypass
    const { data: d1, error: e1 } = await supabase
      .from('produto_comercial')
      .select('count')
      .limit(0);
    results.sdk_no_bypass = { data: d1, error: e1?.message, code: e1?.code };

    return Response.json(results, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});