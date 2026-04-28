/**
 * fixOrcamentoItensColumns — Adiciona colunas faltantes à tabela orcamento_itens
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
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
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const sql = `
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS nome_produto TEXT;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS nome_linha_comercial TEXT;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS nome_cor TEXT;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS codigo_unico TEXT;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS acabamentos TEXT;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS personalizacoes TEXT;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS operacoes TEXT;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS produto_percentual DECIMAL(5,2) DEFAULT 100;
ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS servico_percentual DECIMAL(5,2) DEFAULT 0;
    `.trim();

    // Tenta via pg endpoint do Supabase
    const resp = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    });
    const respText = await resp.text();

    return Response.json({ 
      success: resp.ok,
      message: resp.ok ? 'Colunas adicionadas com sucesso!' : 'Execute manualmente no Supabase SQL Editor:',
      sql,
      status: resp.status,
      response: respText.slice(0, 500),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});