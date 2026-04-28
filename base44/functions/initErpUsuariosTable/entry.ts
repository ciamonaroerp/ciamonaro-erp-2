import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Criar tabela se não existir
    const { error: createTableError } = await supabase.from('erp_usuarios').select('id').limit(1);

    if (createTableError && createTableError.code === 'PGRST116') {
      // Tabela não existe, criar
      console.log('[initErpUsuariosTable] Tabela não existe, criando...');
      
      // Usar SQL direto via uma função auxiliar
      const { data: schemas, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'erp_usuarios');

      if (!schemas || schemas.length === 0) {
        console.log('[initErpUsuariosTable] Criando tabela erp_usuarios com RLS permissivo...');
        
        // Criar tabela com RLS permissivo para MVP
        const createSQL = `
          CREATE TABLE IF NOT EXISTS erp_usuarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            nome VARCHAR(255),
            perfil VARCHAR(100) DEFAULT 'Usuário',
            status VARCHAR(50) DEFAULT 'Ativo',
            modulos_autorizados TEXT[] DEFAULT '{}',
            cadastros_autorizados TEXT[] DEFAULT '{}',
            sistema_autorizado TEXT[] DEFAULT '{}',
            empresa_id UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          ALTER TABLE erp_usuarios ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS erp_usuarios_select ON erp_usuarios;
          CREATE POLICY erp_usuarios_select ON erp_usuarios FOR SELECT USING (true);

          DROP POLICY IF EXISTS erp_usuarios_insert ON erp_usuarios;
          CREATE POLICY erp_usuarios_insert ON erp_usuarios FOR INSERT WITH CHECK (true);

          DROP POLICY IF EXISTS erp_usuarios_update ON erp_usuarios;
          CREATE POLICY erp_usuarios_update ON erp_usuarios FOR UPDATE USING (true) WITH CHECK (true);

          DROP POLICY IF EXISTS erp_usuarios_delete ON erp_usuarios;
          CREATE POLICY erp_usuarios_delete ON erp_usuarios FOR DELETE USING (true);

          CREATE INDEX IF NOT EXISTS idx_erp_usuarios_email ON erp_usuarios(email);
          CREATE INDEX IF NOT EXISTS idx_erp_usuarios_status ON erp_usuarios(status);
        `;

        // Executar em partes
        const sqls = createSQL.split(';').filter(s => s.trim());
        for (const sql of sqls) {
          if (!sql.trim()) continue;
          
          try {
            // Usar método direto do PostgreSQL via fetch
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: sql + ';' }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.log(`[initErpUsuariosTable] SQL parcial executado ou erro tolerado: ${sql.substring(0, 50)}`);
            }
          } catch (e) {
            console.log(`[initErpUsuariosTable] Erro ao executar SQL (tolerado): ${sql.substring(0, 50)}`);
          }
        }
      }
    }

    // Tentar inserir usuário admin se não existir
    const { data: adminExists } = await supabase
      .from('erp_usuarios')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();

    if (!adminExists) {
      console.log('[initErpUsuariosTable] Criando registro de admin para:', user.email);
      
      const { error: insertError } = await supabase
        .from('erp_usuarios')
        .insert([{
          email: user.email,
          nome: user.full_name || 'Admin',
          perfil: 'Administrador',
          status: 'Ativo',
          modulos_autorizados: ['Comercial', 'PPCP', 'Logística', 'Financeiro', 'Compras', 'Estoque MP', 'Estoque PA'],
          cadastros_autorizados: ['*'],
          sistema_autorizado: ['*'],
        }]);

      if (insertError) {
        console.warn('[initErpUsuariosTable] Erro ao inserir admin:', insertError.message);
      } else {
        console.log('[initErpUsuariosTable] Admin criado com sucesso');
      }
    }

    return Response.json({
      sucesso: true,
      mensagem: 'Tabela erp_usuarios inicializada',
    });

  } catch (error) {
    console.error('[initErpUsuariosTable] Erro:', error.message);
    return Response.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    );
  }
});