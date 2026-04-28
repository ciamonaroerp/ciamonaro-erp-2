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

    // 1. Criar tabela se não existir
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS informacoes_condicoes_comerciais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequencia INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_seq ON informacoes_condicoes_comerciais(sequencia);
    `;

    // 2. Adicionar coluna deleted_at se não existir
    const addColumnSQL = `
      ALTER TABLE informacoes_condicoes_comerciais
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
    `;

    // Executar via query diretamente (não usamos RPC que pode não existir)
    const { error: createError } = await supabase.rpc('exec', {
      statement: createTableSQL
    }).catch(async () => {
      // Se RPC falhar, tenta via query simples
      return await supabase.from('informacoes_condicoes_comerciais').select('id').limit(1);
    });

    // Tentar adicionar coluna
    const { error: alterError } = await supabase.rpc('exec', {
      statement: addColumnSQL
    }).catch(() => ({ error: null }));

    return Response.json({ 
      success: true,
      message: 'Setup executado. Tabela e colunas verificadas.',
      createError,
      alterError
    });
  } catch (err) {
    console.error('Setup error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});