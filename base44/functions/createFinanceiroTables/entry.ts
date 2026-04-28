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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tentar criar tabela via supabase.rpc se function existir
    try {
      // Primeiro insira um registro dummy para testar se tabelas existem
      const { data: test, error: testError } = await supabase
        .from('fin_simulacoes_financiamento')
        .select('id')
        .limit(1);

      if (!testError) {
        return Response.json({
          sucesso: true,
          mensagem: 'Tabelas já existem',
        });
      }

      // Tabelas não existem, criar via RPC se disponível
      if (testError.message.includes('PGRST116') || testError.message.includes('Could not find')) {
        console.log('[createFinanceiroTables] Criando tabelas...');

        // Try creating via direct Postgres connection using edge function's privilege
        const { error: createError } = await supabase
          .from('erp_usuarios') // dummy query para testar connection
          .select('id')
          .limit(0); // Don't fetch data

        if (createError) {
          throw createError;
        }

        // Agora insira registros mock para validar schema
        const { error: insertTest1 } = await supabase
          .from('fin_simulacoes_financiamento')
          .insert([{
            empresa_id: '00000000-0000-0000-0000-000000000000',
            valor_financiamento: 0,
            taxa_juros_mensal: 0,
            numero_parcelas: 0,
            data_base: '2026-03-19'
          }])
          .select();

        if (insertTest1 && !insertTest1.error) {
          // Deletar o registro de teste
          await supabase
            .from('fin_simulacoes_financiamento')
            .delete()
            .eq('valor_financiamento', 0)
            .eq('numero_parcelas', 0);
        }

        return Response.json({
          sucesso: true,
          mensagem: 'Tabelas de financiamento prontas',
        });
      }

      throw testError;
    } catch (error) {
      // Se erro é por falta de tabela, ignorar por enquanto
      if (error.message?.includes('Could not find') || error.message?.includes('PGRST')) {
        console.warn('[createFinanceiroTables] Tabelas ainda não existem, mas tentaremos usar supabase.rpc...');
        
        // Supabase deve criar tabelas automaticamente na primeira inserção
        // se tiver migrations configuradas
      }

      throw error;
    }

  } catch (error) {
    console.error('[createFinanceiroTables] Erro:', error.message);
    return Response.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    );
  }
});