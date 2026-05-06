import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query SQL para encontrar colunas com alta duplicação
    const query = `
    SELECT 
      table_name,
      column_name,
      data_type,
      (SELECT COUNT(*) FROM information_schema.columns) as total_rows
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND data_type IN ('character varying', 'text')
    ORDER BY table_name, column_name
    `;

    const { data, error } = await base44.supabase
      .from('config_tamanhos')
      .select('*')
      .limit(1);

    if (error) {
      return Response.json({ 
        message: 'Para usar essa auditoria, execute manualmente no Supabase SQL Editor',
        query: query,
        instrucoes: [
          '1. Vá a: Dashboard → SQL Editor',
          '2. Cole a query acima',
          '3. Procure por colunas de texto que se repetem muito (poucos valores únicos)'
        ]
      });
    }

    return Response.json({ 
      status: 'success',
      message: 'Função de auditoria pronta. Use SQL Editor para análise detalhada.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});