import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    // Query information_schema.tables
    const tablesRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({
        sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
      })
    });

    let tables = [];
    if (tablesRes.ok) {
      const tablesData = await tablesRes.json();
      tables = (tablesData || []).map(r => r.table_name);
    } else {
      // Fallback: use Supabase REST API to detect tables individually
      const knownTables = [
        'clientes', 'transportadoras', 'fornecedores', 'pedidos', 'pedidos_itens',
        'ordens_producao', 'estoque_produtos', 'materias_primas', 'usuarios', 'empresas',
        'erp_usuarios', 'modulos_erp', 'produtos', 'modalidade_frete', 'solicitacao_ppcp',
        'solicitacao_frete', 'chat_comercial', 'audit_logs', 'notificacoes'
      ];

      for (const t of knownTables) {
        const r = await fetch(`${supabaseUrl}/rest/v1/${t}?limit=0`, {
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          }
        });
        if (r.status !== 404 && r.status !== 400) {
          tables.push(t);
        }
      }
    }

    // Query columns for each table using information_schema
    const columnsRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({
        sql: `SELECT table_name, column_name, data_type, is_nullable 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              ORDER BY table_name, ordinal_position;`
      })
    });

    let columns = [];
    if (columnsRes.ok) {
      columns = await columnsRes.json();
    } else {
      // Fallback: query each known table for column info via HEAD
      for (const table of tables) {
        const r = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=0`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Accept': 'application/json',
          }
        });

        if (r.ok) {
          // Can't determine columns easily without exec_sql, return empty for this table
          columns.push({ table_name: table, column_name: '__detected__', data_type: 'unknown' });
        }
      }
    }

    // Group columns by table
    const columnsByTable = {};
    for (const col of columns) {
      if (!columnsByTable[col.table_name]) columnsByTable[col.table_name] = [];
      columnsByTable[col.table_name].push({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES'
      });
    }

    return Response.json({ tables, columns: columnsByTable });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});