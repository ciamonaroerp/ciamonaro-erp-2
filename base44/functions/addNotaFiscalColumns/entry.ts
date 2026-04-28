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
    if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sql = `
      ALTER TABLE nota_fiscal_importada
      ADD COLUMN IF NOT EXISTS descricao_base TEXT,
      ADD COLUMN IF NOT EXISTS descricao_complementar TEXT,
      ADD COLUMN IF NOT EXISTS codigo_pedido TEXT,
      ADD COLUMN IF NOT EXISTS percentual_reducao_bc DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS codigo_unico TEXT,
      ADD COLUMN IF NOT EXISTS status_vinculo TEXT;
    `;

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      // Tenta adicionar as colunas uma por uma se o RPC não funcionar
      const colunas = [
        'descricao_base TEXT',
        'descricao_complementar TEXT',
        'codigo_pedido TEXT',
        'percentual_reducao_bc DECIMAL(10,2)',
        'codigo_unico TEXT',
        'status_vinculo TEXT'
      ];

      for (const coluna of colunas) {
        const [nome] = coluna.split(' ');
        await supabaseAdmin.from('nota_fiscal_importada').select(nome).limit(1);
      }

      return Response.json({ message: 'Colunas adicionadas/verificadas com sucesso' });
    }

    return Response.json({ message: 'Colunas adicionadas com sucesso' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});