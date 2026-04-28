import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Busca as colunas da tabela
    const { data, error } = await supabase
      .from('tabela_precos_sync')
      .select()
      .limit(1);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Se conseguiu buscar, analisa as colunas
    if (data && data.length > 0) {
      const colunas = Object.keys(data[0]);
      return Response.json({ colunas, total_colunas: colunas.length, sample: data[0] });
    }

    // Se tabela vazia, tenta com introspection
    const { data: info } = await supabase
      .rpc('get_table_columns', { table_name: 'tabela_precos_sync' })
      .catch(() => ({ data: null }));

    return Response.json({ 
      message: 'Tabela vazia ou introspection falhou', 
      info,
      hint: 'Verifique o schema da tabela manualmente'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});