import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query SQL para encontrar colunas de texto com potencial de normalização
    const sqlQuery = `
-- Colunas de texto que se repetem muito (candidatas a normalização)
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  COUNT(*) as total_registros,
  COUNT(DISTINCT c2.column_name) as valores_unicos,
  ROUND(100.0 * (1 - COUNT(DISTINCT c2.column_name)::numeric / COUNT(*)), 1) as taxa_duplicacao_pct
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND c.data_type IN ('character varying', 'text')
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, c.column_name, c.data_type
HAVING COUNT(DISTINCT c2.column_name) < 50  -- menos de 50 valores únicos
ORDER BY taxa_duplicacao_pct DESC, total_registros DESC;
    `;

    return Response.json({ 
      status: 'success',
      message: 'Execute a query abaixo no SQL Editor do Supabase para encontrar candidatos a normalização',
      sqlQuery: sqlQuery,
      instrucoes: [
        '1. Abra: Supabase Dashboard → SQL Editor',
        '2. Cole a query acima',
        '3. Procure por colunas com taxa_duplicacao_pct > 70%',
        '4. Essas são as melhores candidatas para criar tabelas de lookup'
      ]
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});