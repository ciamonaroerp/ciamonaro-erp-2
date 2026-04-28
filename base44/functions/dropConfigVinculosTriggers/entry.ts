/**
 * Dropa todos os triggers da tabela config_vinculos via SQL raw no Supabase
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

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    // Lista triggers via pg_trigger
    const listSql = `
      SELECT tgname, tgenabled, tgtype
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = 'config_vinculos'
        AND NOT tgisinternal;
    `;

    let triggers = null, listErr = null;
    try {
      const res = await supabase.rpc('exec_sql', { sql: listSql });
      triggers = res.data;
      listErr = res.error;
    } catch(e) {
      listErr = { message: 'exec_sql não disponível' };
    }

    if (action === 'list') {
      // Tenta listar via information_schema
      const { data: trigInfo, error: trigErr } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name, event_manipulation, action_statement')
        .eq('event_object_table', 'config_vinculos');

      return Response.json({
        triggers_from_rpc: triggers,
        triggers_from_schema: trigInfo,
        errors: { rpc: listErr?.message, schema: trigErr?.message }
      });
    }

    if (action === 'drop_all') {
      // Abordagem: tenta dropar triggers conhecidos pelo nome
      const knownTriggers = [
        'set_updated_at',
        'update_updated_at',
        'set_codigo_unico',
        'generate_codigo_unico',
        'tr_config_vinculos_updated_at',
        'tr_updated_at',
        'handle_updated_at',
        'config_vinculos_updated_at',
        'reset_deleted_at',
        'prevent_delete',
        'before_update_config_vinculos',
        'after_update_config_vinculos',
      ];

      const results = [];
      for (const name of knownTriggers) {
        const sql = `DROP TRIGGER IF EXISTS "${name}" ON config_vinculos CASCADE;`;
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql }),
        });
        results.push({ trigger: name, status: res.status, ok: res.ok });
      }

      // Testa se o update funciona agora
      const { error: testErr } = await supabase
        .from('config_vinculos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', body.test_id || '00000000-0000-0000-0000-000000000000');

      return Response.json({ results, testError: testErr?.message || null });
    }

    if (action === 'force_delete') {
      // Força o soft delete usando SQL direto via fetch REST
      const { id, empresa_id } = body;
      if (!id) return Response.json({ error: 'id é obrigatório' }, { status: 400 });

      // Atualiza direto com timestamp fixo
      const { data, error } = await supabase
        .from('config_vinculos')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      return Response.json({ data, error: error?.message });
    }

    return Response.json({ error: 'action inválida. Use: list, drop_all, force_delete' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});