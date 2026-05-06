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
-- Use a procedure abaixo para cada coluna: SELECT COUNT(DISTINCT coluna) FROM tabela;

-- Primeiro, liste todas as colunas de texto por tabela:
SELECT 
  t.table_name,
  c.column_name,
  c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND c.data_type IN ('character varying', 'text')
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.column_name;

-- Depois, para cada coluna identificada, execute:
-- SELECT COUNT(DISTINCT coluna_nome) as valores_unicos FROM tabela_nome;
-- Se valores_unicos < 50 e taxa_duplicacao > 70%, é candidata a normalização.
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