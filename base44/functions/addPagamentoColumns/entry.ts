/**
 * addPagamentoColumns — Adiciona colunas de pagamento à tabela com_orcamentos
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sql = `
      ALTER TABLE public.com_orcamentos ADD COLUMN IF NOT EXISTS data_proposta DATE;
      ALTER TABLE public.com_orcamentos ADD COLUMN IF NOT EXISTS data_entrega_pagamento DATE;
      ALTER TABLE public.com_orcamentos ADD COLUMN IF NOT EXISTS prazo_entrega TEXT;
      ALTER TABLE public.com_orcamentos ADD COLUMN IF NOT EXISTS validade_proposta DATE;
      ALTER TABLE public.com_orcamentos ADD COLUMN IF NOT EXISTS desconto_pagamento NUMERIC DEFAULT 0;
      ALTER TABLE public.com_orcamentos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
      ALTER TABLE public.com_orcamentos ADD COLUMN IF NOT EXISTS parcelas_pagamento JSONB;
    `;

    const res = await base44.functions.invoke('supabaseCRUD', {
      action: 'run_sql',
      sql,
    });

    const result = res?.data;

    if (result?.error && result.error !== 'SUPABASE_DB_URL não configurada') {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: result?.success
        ? 'Colunas adicionadas com sucesso!'
        : 'SUPABASE_DB_URL não configurada. Execute o SQL abaixo manualmente no Supabase Dashboard > SQL Editor.',
      sql_para_executar: result?.sql_para_executar || null,
      details: result,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});