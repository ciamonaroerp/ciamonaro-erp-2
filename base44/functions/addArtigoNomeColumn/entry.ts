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

    // Executa SQL bruto para adicionar coluna
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE orcamento_itens
            ADD COLUMN IF NOT EXISTS artigo_nome TEXT;
            COMMENT ON COLUMN orcamento_itens.artigo_nome IS 'Nome do artigo/material';`
    }).catch(async () => {
      // Fallback: tenta via tabela auxiliar se rpc não existir
      const { data: schema, error: schemaErr } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'orcamento_itens')
        .eq('column_name', 'artigo_nome');

      if (schemaErr || !schema?.length) {
        return { error: { message: 'Coluna precisa ser criada manualmente via SQL' } };
      }
      return { error: null };
    });

    if (error) {
      return Response.json({ 
        warning: 'Coluna pode já existir ou SQL direto não disponível',
        details: error.message,
        instruction: 'Execute: ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS artigo_nome TEXT;'
      }, { status: 200 });
    }

    return Response.json({ 
      success: true, 
      message: 'Coluna artigo_nome adicionada com sucesso à tabela orcamento_itens' 
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      instruction: 'Execute manualmente: ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS artigo_nome TEXT;'
    }, { status: 500 });
  }
});