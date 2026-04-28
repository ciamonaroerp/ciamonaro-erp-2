/**
 * Remove o trigger que sobrescreve codigo_unico via Supabase REST API (pg_catalog).
 * A abordagem é criar uma função SQL temporária que faz o DROP e chamá-la via RPC.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // Tenta criar a stored procedure via insert no pg_catalog (não funciona)
  // Alternativa: usar o endpoint /pg/query da Supabase v2 API
  const pgQueryRes = await fetch(`${supabaseUrl}/pg/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        SELECT t.tgname AS trigger_name, p.proname AS function_name
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'config_tecido_vinculos'
        AND NOT t.tgisinternal
      `
    })
  });
  const pgStatus = pgQueryRes.status;
  const pgBody = await pgQueryRes.text();

  // Tenta via /rest/v1/rpc com uma função que já deve existir no Supabase
  // Cria uma função temporária via INSERT no esquema public usando plpgsql
  const createFnRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({})
  });

  // Testa direto pelo Supabase v1 queries endpoint
  const v1QueryRes = await fetch(`${supabaseUrl}/rest/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: 'SELECT 1' })
  });
  const v1Status = v1QueryRes.status;
  const v1Body = await v1QueryRes.text();

  if (action === 'diagnose') {
    return Response.json({
      pgStatus,
      pgBody: pgBody.substring(0, 500),
      v1Status,
      v1Body: v1Body.substring(0, 300),
    });
  }

  if (action === 'drop') {
    // Tenta via pg endpoint
    const dropRes = await fetch(`${supabaseUrl}/pg/query`, {
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
              WHERE c.relname = 'config_tecido_vinculos'
              AND NOT t.tgisinternal
            LOOP
              EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.config_tecido_vinculos';
            END LOOP;
          END; $$;
        `
      })
    });
    const dropBody = await dropRes.text();

    // Verifica
    const { data: artigo } = await supabase.from('config_tecido_artigo').select('id, empresa_id').limit(1).single();
    const { data: cor } = await supabase.from('config_tecido_cor').select('id').limit(1).single();
    const { data: linha } = await supabase.from('config_tecido_linha_comercial').select('id').limit(1).single();

    let testResult = null;
    if (artigo && cor && linha) {
      const codigoTeste = `FIXTEST-${Date.now()}`;
      const { data: inserted } = await supabase
        .from('config_tecido_vinculos')
        .insert({ empresa_id: artigo.empresa_id, artigo_id: artigo.id, cor_tecido_id: cor.id, linha_comercial_id: linha.id, codigo_unico: codigoTeste })
        .select().single();

      testResult = { codigoEnviado: codigoTeste, codigoSalvo: inserted?.codigo_unico, fixed: inserted?.codigo_unico === codigoTeste };
      if (inserted?.id) await supabase.from('config_tecido_vinculos').delete().eq('id', inserted.id);
    }

    return Response.json({ dropStatus: dropRes.status, dropBody: dropBody.substring(0, 500), testResult });
  }

  return Response.json({ message: 'Use action: "diagnose" ou "drop"', pgStatus, pgBody: pgBody.substring(0, 300) });
});