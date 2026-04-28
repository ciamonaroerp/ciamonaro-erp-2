/**
 * initEstoqueSaldo — Cria a tabela estoque_saldo_atual e popula a partir do histórico
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get("VITE_SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Tenta criar a tabela via query direta (Supabase Management API)
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    // Extrai project ref da URL (ex: https://xyzabc.supabase.co)
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

    const createSQL = `
      CREATE TABLE IF NOT EXISTS estoque_saldo_atual (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        codigo_unico TEXT NOT NULL,
        local_id UUID NOT NULL,
        saldo NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (empresa_id, codigo_unico, local_id)
      );
      CREATE INDEX IF NOT EXISTS idx_saldo_empresa_codigo ON estoque_saldo_atual(empresa_id, codigo_unico);
      CREATE INDEX IF NOT EXISTS idx_saldo_empresa_local ON estoque_saldo_atual(empresa_id, local_id);
    `;

    const sqlResp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: createSQL }),
    });

    if (!sqlResp.ok) {
      const errBody = await sqlResp.text();
      console.warn('Management API falhou, tentando via RPC alternativo:', errBody);
      // Tenta via postgrest RPC se disponível
      const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: createSQL }),
      });
      if (!rpcResp.ok) {
        return Response.json({ error: 'Não foi possível criar a tabela automaticamente. Execute o SQL manualmente no Supabase Studio.', sql: createSQL }, { status: 500 });
      }
    }

    // Recalcula saldos a partir do histórico existente
    const { data: movs, error: movsErr } = await supabase
      .from('estoque_movimentacoes')
      .select('*')
      .is('deleted_at', null);

    if (movsErr) {
      return Response.json({ error: movsErr.message }, { status: 500 });
    }

    // Agrega saldos
    const saldoMap = {}; // key: "empresa_id|codigo_unico|local_id" → saldo
    for (const m of (movs || [])) {
      const qtd = parseFloat(m.quantidade) || 0;
      const empId = m.empresa_id;
      const cu = m.codigo_unico;
      if (!cu || !empId) continue;

      if (m.local_destino_id) {
        const k = `${empId}|${cu}|${m.local_destino_id}`;
        saldoMap[k] = (saldoMap[k] || 0) + qtd;
      }
      if (m.local_origem_id) {
        const k = `${empId}|${cu}|${m.local_origem_id}`;
        saldoMap[k] = (saldoMap[k] || 0) - qtd;
      }
    }

    // Upsert saldos
    const rows = Object.entries(saldoMap).map(([key, saldo]) => {
      const [empresa_id, codigo_unico, local_id] = key.split('|');
      return { empresa_id, codigo_unico, local_id, saldo };
    });

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('estoque_saldo_atual')
        .upsert(rows, { onConflict: 'empresa_id,codigo_unico,local_id' });

      if (upsertErr) {
        return Response.json({ error: upsertErr.message }, { status: 500 });
      }
    }

    return Response.json({ success: true, tabela_criada: true, saldos_migrados: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});