/**
 * Adiciona coluna empresa_id à tabela orcamento_itens (se não existir)
 * e gera o SQL para recarregar o schema cache do PostgREST.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!serviceKey) {
      // Sem service key: retorna o SQL para execução manual
      return Response.json({
        message: 'Execute este SQL no Supabase Dashboard → SQL Editor:',
        sql: `
-- 1. Adicionar coluna empresa_id em orcamento_itens
ALTER TABLE public.orcamento_itens 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.erp_usuarios(id) ON DELETE SET NULL;

-- 2. Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
        `.trim()
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tenta adicionar a coluna via rpc exec_sql
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS empresa_id UUID;`
    }).catch(() => ({ error: { message: 'rpc nao disponivel' } }));

    // Tenta via pg endpoint
    const resp = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS empresa_id UUID; NOTIFY pgrst, 'reload schema';`
      })
    });

    return Response.json({
      success: resp.ok,
      status: resp.status,
      rpc_error: e1?.message,
      manual_sql: `
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS empresa_id UUID;
NOTIFY pgrst, 'reload schema';
      `.trim(),
      message: resp.ok
        ? 'Coluna empresa_id adicionada. Schema cache recarregado.'
        : 'Execute o SQL manual_sql no Supabase SQL Editor.'
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});