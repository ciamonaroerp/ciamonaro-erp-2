import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Consulta a info da tabela
    const { data, error } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'nota_fiscal_importada')
      .eq('table_schema', 'public');

    if (error) {
      return Response.json({ error: error.message, columns: [] });
    }

    const hasDescricaoBase = data?.some(c => c.column_name === 'descricao_base');
    const hasDescricaoComplementar = data?.some(c => c.column_name === 'descricao_complementar');

    return Response.json({
      colunas: data,
      tem_descricao_base: hasDescricaoBase,
      tem_descricao_complementar: hasDescricaoComplementar,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});