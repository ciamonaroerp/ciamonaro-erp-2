import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Criar constraint única em (codigo_produto, codigo_unico_artigo)
    // Se não existir a coluna descricao_artigo renomear para codigo_unico_artigo
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          -- Verificar se a constraint já existe
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'tabela_precos_sync' 
            AND constraint_name = 'uq_tabela_precos_sync_codigo_produto_artigo'
          ) THEN
            ALTER TABLE tabela_precos_sync 
            ADD CONSTRAINT uq_tabela_precos_sync_codigo_produto_artigo 
            UNIQUE (empresa_id, codigo_produto, codigo_unico);
          END IF;

          -- Adicionar coluna status se não existir
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tabela_precos_sync' 
            AND column_name = 'status'
          ) THEN
            ALTER TABLE tabela_precos_sync 
            ADD COLUMN status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo'));
          END IF;

          -- Adicionar coluna updated_at se não existir
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tabela_precos_sync' 
            AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE tabela_precos_sync 
            ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
          END IF;
        END $$;
      `
    });

    if (constraintError) {
      console.error('Erro ao criar constraint:', constraintError);
      return Response.json({ error: constraintError.message }, { status: 400 });
    }

    return Response.json({ success: true, message: 'Constraint e colunas criadas com sucesso' });
  } catch (error) {
    console.error('Exception:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});