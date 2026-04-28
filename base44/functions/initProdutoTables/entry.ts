import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const sqlStatements = [
      // Drop existing tables if they exist
      `DROP TABLE IF EXISTS produto_comercial_artigo CASCADE;`,
      `DROP TABLE IF EXISTS produto_comercial CASCADE;`,
      
      // Create produto_comercial
      `CREATE TABLE IF NOT EXISTS produto_comercial (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        nome_produto TEXT NOT NULL,
        descricao TEXT,
        status TEXT DEFAULT 'Ativo',
        created_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
        created_by TEXT
      );`,
      
      // Create produto_comercial_artigo
      `CREATE TABLE IF NOT EXISTS produto_comercial_artigo (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        produto_id UUID NOT NULL REFERENCES produto_comercial(id) ON DELETE CASCADE,
        artigo TEXT NOT NULL,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
        created_by TEXT
      );`,
      
      // Disable RLS to allow all access
      `ALTER TABLE produto_comercial DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE produto_comercial_artigo DISABLE ROW LEVEL SECURITY;`,
      
      // Create indexes
      `CREATE INDEX idx_produto_comercial_empresa ON produto_comercial(empresa_id);`,
      `CREATE INDEX idx_produto_comercial_artigo_produto ON produto_comercial_artigo(produto_id);`,
      `CREATE INDEX idx_produto_comercial_artigo_empresa ON produto_comercial_artigo(empresa_id);`
    ];

    // Execute each statement
    for (const sql of sqlStatements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => {
          // exec_sql might not exist, try alternative
          return { error: { message: 'RPC not available' } };
        });
        if (error?.message !== 'RPC not available') {
          console.log(`Executed: ${sql.substring(0, 50)}...`, { error });
        }
      } catch (e) {
        console.log(`Statement error: ${sql.substring(0, 50)}...`, e.message);
      }
    }

    // Test if tables are accessible now
    const { data: testData, error: testError } = await supabase
      .from('produto_comercial')
      .select('id')
      .limit(1);

    return Response.json({ 
      success: !testError,
      message: testError ? `Ainda inacessível: ${testError.message}` : 'Tabelas criadas e acessíveis',
      hint: 'Se ainda inacessível, execute manualmente no Supabase SQL Editor os comandos acima'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});