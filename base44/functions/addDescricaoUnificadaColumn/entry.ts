import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Executa SQL para adicionar a coluna
    const { error } = await supabase.rpc('add_column_if_not_exists', {
      table_name: 'config_vinculos',
      column_name: 'descricao_unificada',
      column_type: 'text'
    });

    if (error) {
      console.log('RPC não disponível, tentando SQL direto...');
      
      // Alternativa: SQL direto (pode não funcionar em Supabase padrão)
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        query: `ALTER TABLE config_vinculos ADD COLUMN IF NOT EXISTS descricao_unificada TEXT;`
      });

      if (sqlError) {
        return Response.json({
          success: false,
          message: 'Não foi possível adicionar coluna via RPC. Use o painel Supabase manualmente.',
          details: sqlError.message
        }, { status: 400 });
      }
    }

    return Response.json({
      success: true,
      message: 'Coluna descricao_unificada adicionada com sucesso a config_vinculos'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});