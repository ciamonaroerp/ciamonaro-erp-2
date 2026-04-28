/**
 * Remove triggers problemáticos da tabela config_vinculos
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tenta listar triggers via pg_catalog
    let triggers = null, trigErr = null;
    try {
      const r = await supabase.rpc('exec_sql', { sql: `
        SELECT t.tgname, p.proname
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'config_vinculos'
        AND NOT t.tgisinternal
      ` });
      triggers = r.data;
      trigErr = r.error;
    } catch (e) { trigErr = e.message; }

    // Tenta dropar via rpc
    const dropResults = [];

    // Tenta via Management API
    const mgmtRes = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/pg/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          DO $$
          DECLARE r RECORD;
          BEGIN
            FOR r IN
              SELECT t.tgname
              FROM pg_trigger t
              JOIN pg_class c ON t.tgrelid = c.oid
              WHERE c.relname = 'config_vinculos'
              AND NOT t.tgisinternal
            LOOP
              EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.config_vinculos CASCADE';
              RAISE NOTICE 'Dropped trigger: %', r.tgname;
            END LOOP;
          END; $$;
        `
      })
    });
    const mgmtBody = await mgmtRes.text();
    dropResults.push({ via: 'management_api', status: mgmtRes.status, body: mgmtBody.substring(0, 300) });

    // Testa se o update agora funciona
    const { data: testData, error: testErr } = await supabase
      .from('config_vinculos')
      .select('id')
      .limit(1)
      .maybeSingle();

    let updateTest = null;
    if (testData?.id) {
      const { error: upErr } = await supabase
        .from('config_vinculos')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testData.id);
      updateTest = upErr ? `FALHOU: ${upErr.message}` : 'OK';
    }

    return Response.json({
      triggers: triggers || trigErr,
      dropResults,
      updateTest,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});