import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { table_name } = await req.json();

    // Tenta listar dados para ver o schema
    const { data, error } = await base44.asServiceRole.fetch(
      `https://${Deno.env.get('VITE_SUPABASE_URL')}/rest/v1/${table_name}?limit=0`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_SERVICE_KEY'),
        },
      }
    );

    if (!error) {
      const responseHeaders = response.headers;
      const contentRange = responseHeaders.get('content-range');
      const columns = Object.keys(data[0] || {});
      return Response.json({ table: table_name, columns, contentRange, status: 'existe' });
    } else {
      return Response.json({ table: table_name, error: error.message, status: 'nao_existe' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});