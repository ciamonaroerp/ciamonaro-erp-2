import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Altera a coluna valor para numeric(15,6) para suportar até 6 casas decimais
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE produto_rendimento_valores ALTER COLUMN valor TYPE numeric(15,6);`
    });

    // Se não tiver a RPC exec_sql, tenta via query direta
    if (error) {
      console.log('[fixValorColunaPrecisao] exec_sql falhou, tentando via REST:', error.message);
      return Response.json({ 
        error: 'Não foi possível alterar via RPC. Execute manualmente no SQL Editor do Supabase: ALTER TABLE produto_rendimento_valores ALTER COLUMN valor TYPE numeric(15,6);',
        sql: 'ALTER TABLE produto_rendimento_valores ALTER COLUMN valor TYPE numeric(15,6);'
      }, { status: 400 });
    }

    return Response.json({ success: true, message: 'Coluna valor alterada para numeric(15,6) com sucesso.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});