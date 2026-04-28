import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Usa supabaseCRUD para executar SQL direto
    const result = await base44.functions.invoke('supabaseCRUD', {
      action: 'execute_sql',
      sql: `ALTER TABLE produto_rendimento_valores ADD COLUMN IF NOT EXISTS vinculo_id UUID;`
    });

    if (result.data?.error) {
      return Response.json({ error: result.data.error }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      message: 'Column vinculo_id added to produto_rendimento_valores'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});