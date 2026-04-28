/**
 * initOrcamentoItensTable — Cria a tabela orcamento_itens via supabaseCRUD
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

    // SQL para criar a tabela
    const sqlScript = `
      CREATE TABLE IF NOT EXISTS public.orcamento_itens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        orcamento_id UUID NOT NULL,
        tipo_item TEXT NOT NULL,
        sequencia INTEGER NOT NULL,
        
        -- Produto
        produto_id UUID,
        nome_produto TEXT,
        quantidade DECIMAL(10, 2),
        valor_unitario DECIMAL(12, 2),
        subtotal DECIMAL(12, 2),
        
        -- Tecido
        vinculo_tecido_id UUID,
        nome_linha_comercial TEXT,
        nome_cor TEXT,
        
        -- Acabamentos e Personalizações (JSON arrays)
        acabamentos TEXT,
        personalizacoes TEXT,
        operacoes TEXT,
        
        -- Produto e Serviço
        produto_percentual DECIMAL(5, 2),
        servico_percentual DECIMAL(5, 2),
        
        -- Serviço
        observacoes TEXT,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id
      ON public.orcamento_itens (orcamento_id);

      ALTER TABLE public.orcamento_itens DISABLE ROW LEVEL SECURITY;
      GRANT ALL PRIVILEGES ON TABLE public.orcamento_itens TO service_role;
    `;

    // Executa cada comando SQL separado
    const commands = sqlScript.split(';').filter(cmd => cmd.trim());
    const results = [];

    for (const cmd of commands) {
      if (!cmd.trim()) continue;
      try {
        // Tenta executar diretamente sem RPC
        const result = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: cmd.trim() })
        });
        results.push({ cmd: cmd.slice(0, 50), status: result.status });
      } catch (e) {
        results.push({ cmd: cmd.slice(0, 50), error: e.message });
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Execute o SQL manualmente no Supabase SQL Editor se necessário',
      sqlScript,
      results
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});