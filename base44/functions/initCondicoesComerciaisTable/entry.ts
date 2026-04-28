import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Criar tabela se não existir
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS informacoes_condicoes_comerciais (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sequencia INTEGER NOT NULL,
          descricao TEXT NOT NULL,
          deleted_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_date TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_deleted_at ON informacoes_condicoes_comerciais(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_sequencia ON informacoes_condicoes_comerciais(sequencia);
      `
    });

    if (createError && !createError.message.includes('does not exist')) {
      console.log('RPC exec_sql não disponível, tentando com execSQL');
    }

    // Verificar e adicionar coluna deleted_at se não existir
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'informacoes_condicoes_comerciais')
      .eq('column_name', 'deleted_at');

    if (!columns || columns.length === 0) {
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE informacoes_condicoes_comerciais ADD COLUMN deleted_at TIMESTAMP NULL;`
      });
      
      if (alterError) {
        console.log('Tentativa de adicionar coluna via RPC falhou:', alterError);
      }
    }

    return Response.json({ success: true, message: 'Tabela inicializada' });
  } catch (err) {
    console.error('Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});