/**
 * fixOrcamentoItensTable — Dropar e recriar tabela orcamento_itens corretamente
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
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tenta dropar tabela antiga (será recriada vazia)
    const dropResult = await supabase.rpc('exec_sql', { 
      sql_query: 'DROP TABLE IF EXISTS public.orcamento_itens CASCADE;'
    }).single();

    // Cria tabela correta
    const createResult = await supabase.rpc('exec_sql', { 
      sql_query: `
        CREATE TABLE public.orcamento_itens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          orcamento_id UUID NOT NULL,
          tipo_item TEXT NOT NULL,
          sequencia INTEGER NOT NULL,
          quantidade DECIMAL(10, 2) NOT NULL DEFAULT 1,
          valor_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0,
          subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
          
          -- Produto
          produto_id UUID,
          nome_produto TEXT,
          
          -- Tecido (vinculo)
          vinculo_tecido_id UUID,
          nome_linha_comercial TEXT,
          nome_cor TEXT,
          
          -- Acabamentos e Personalizações (JSON arrays armazenados como TEXT)
          acabamentos TEXT,
          personalizacoes TEXT,
          operacoes TEXT,
          
          -- Produto e Serviço (percentuais)
          produto_percentual DECIMAL(5, 2),
          servico_percentual DECIMAL(5, 2),
          
          -- Serviço
          observacoes TEXT,
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          deleted_at TIMESTAMP
        );

        CREATE INDEX idx_orcamento_itens_orcamento_id
        ON public.orcamento_itens (orcamento_id);

        ALTER TABLE public.orcamento_itens DISABLE ROW LEVEL SECURITY;
        GRANT ALL PRIVILEGES ON TABLE public.orcamento_itens TO service_role;
      `
    }).single();

    return Response.json({ 
      success: true, 
      message: 'Tabela orcamento_itens recriada com sucesso',
      dropResult,
      createResult
    });
  } catch (err) {
    return Response.json({ 
      error: err.message,
      note: 'Se exec_sql não existir, execute manualmente no Supabase SQL Editor'
    }, { status: 500 });
  }
});