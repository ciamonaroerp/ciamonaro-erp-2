import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verificar se tabela existe
    const { data: existingTable } = await supabase
      .from('informacoes_complementares')
      .select('id')
      .limit(1);

    if (existingTable !== null) {
      return Response.json({ message: 'Tabela já existe' });
    }

    // Criar tabela
    const { error: createError } = await supabase.rpc('exec', {
      statement: `
        CREATE TABLE IF NOT EXISTS informacoes_complementares (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          titulo TEXT NOT NULL,
          descricao TEXT NOT NULL,
          deleted_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_informacoes_deleted_at 
        ON informacoes_complementares(deleted_at);
      `
    }).catch(() => ({ error: null }));

    return Response.json({ 
      success: true,
      message: 'Tabela inicializada com sucesso'
    });
  } catch (err) {
    console.error('Init error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});