import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        query: `ALTER TABLE produto_rendimento_valores ADD COLUMN IF NOT EXISTS vinculo_id UUID;`
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('Response status:', response.status);
      console.log('Error:', error);
      return Response.json({ error: `Failed: ${error}` }, { status: response.status });
    }

    return Response.json({
      status: 'success',
      message: 'Column vinculo_id added successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});