import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const SCRIPTS_CRITICOS = [
  {
    id: 1,
    tabela: 'orcamento_itens',
    coluna_de: 'cor_nome',
    coluna_para: 'nome_cor',
    sql: 'ALTER TABLE "orcamento_itens" RENAME COLUMN "cor_nome" TO "nome_cor";',
  },
  {
    id: 2,
    tabela: 'tabela_precos_sync',
    coluna_de: 'cor_nome',
    coluna_para: 'nome_cor',
    sql: 'ALTER TABLE "tabela_precos_sync" RENAME COLUMN "cor_nome" TO "nome_cor";',
  },
  {
    id: 3,
    tabela: 'tabela_precos_sync',
    coluna_de: 'linha_nome',
    coluna_para: 'nome_linha_comercial',
    sql: 'ALTER TABLE "tabela_precos_sync" RENAME COLUMN "linha_nome" TO "nome_linha_comercial";',
  },
];

Deno.serve(async (req) => {
  try {
    // Validar credenciais
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({
        error: 'Credenciais Supabase não configuradas',
      }, { status: 500 });
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resultado = {
      timestamp: new Date().toISOString(),
      total_scripts: SCRIPTS_CRITICOS.length,
      executados: 0,
      falhados: 0,
      resultados: [],
    };

    // Executar cada script via RPC
    for (const script of SCRIPTS_CRITICOS) {
      try {
        console.log(`[executarMigracoesNomenclatura] Executando: ${script.sql}`);

        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: script.sql 
        });

        if (error) {
          console.error(`[executarMigracoesNomenclatura] Erro no script ${script.id}:`, error.message);
          resultado.resultados.push({
            id: script.id,
            tabela: script.tabela,
            de: script.coluna_de,
            para: script.coluna_para,
            status: 'ERRO',
            mensagem: error.message,
          });
          resultado.falhados++;
        } else {
          resultado.resultados.push({
            id: script.id,
            tabela: script.tabela,
            de: script.coluna_de,
            para: script.coluna_para,
            status: 'SUCESSO',
            mensagem: 'Coluna renomeada com sucesso',
            dados: data,
          });
          resultado.executados++;
        }
      } catch (error) {
        console.error(`[executarMigracoesNomenclatura] Exceção no script ${script.id}:`, error.message);
        resultado.resultados.push({
          id: script.id,
          tabela: script.tabela,
          de: script.coluna_de,
          para: script.coluna_para,
          status: 'ERRO',
          mensagem: error.message,
        });
        resultado.falhados++;
      }
    }

    resultado.sucesso = resultado.falhados === 0;

    if (resultado.sucesso) {
      console.log('[executarMigracoesNomenclatura] Todas as 3 migrações completadas com sucesso');
    } else {
      console.warn(`[executarMigracoesNomenclatura] ${resultado.falhados} de ${SCRIPTS_CRITICOS.length} migrações falharam`);
    }

    return Response.json(resultado);
  } catch (error) {
    console.error('[executarMigracoesNomenclatura]', error.message);
    return Response.json({
      error: error.message,
      sucesso: false,
    }, { status: 500 });
  }
});