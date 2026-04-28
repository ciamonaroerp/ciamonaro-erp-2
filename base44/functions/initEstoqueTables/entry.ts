import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, serviceKey);

    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const sqls = [
      `CREATE TABLE IF NOT EXISTS estoque_locais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'DEPOSITO' CHECK (tipo IN ('DEPOSITO','CLIENTE','TERCEIRO')),
        ativo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        codigo_unico TEXT NOT NULL,
        local_origem_id UUID REFERENCES estoque_locais(id),
        local_destino_id UUID REFERENCES estoque_locais(id),
        tipo TEXT NOT NULL DEFAULT 'ENTRADA_XML' CHECK (tipo IN ('ENTRADA_XML','SAIDA_PRODUCAO','TRANSFERENCIA','AJUSTE')),
        quantidade NUMERIC NOT NULL DEFAULT 0,
        documento_origem TEXT,
        documento_id TEXT,
        observacao TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )`,
    ];

    const results = [];
    for (const sql of sqls) {
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sql }),
      });
      const body = await resp.json().catch(() => ({}));
      results.push({ status: resp.status, body });
    }

    // Seed depósito padrão se não houver nenhum
    const { data: eu } = await supabase.from('erp_usuarios')
      .select('empresa_id').eq('email', user.email).maybeSingle();

    if (eu?.empresa_id) {
      const { data: existentes } = await supabase.from('estoque_locais')
        .select('id').eq('empresa_id', eu.empresa_id).is('deleted_at', null).limit(1);
      if (!existentes || existentes.length === 0) {
        await supabase.from('estoque_locais').insert({
          empresa_id: eu.empresa_id,
          nome: 'Depósito Principal',
          tipo: 'DEPOSITO',
          ativo: true,
        });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});