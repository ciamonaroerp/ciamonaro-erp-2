import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get("VITE_SUPABASE_URL");
    const key = Deno.env.get("VITE_SUPABASE_ANON_KEY");
    const empresa_id = Deno.env.get("VITE_EMPRESA_ID");

    if (!url || !key) {
      return Response.json(
        { error: "Supabase não configurado" },
        { status: 500 }
      );
    }

    return Response.json({
      url,
      key,
      empresa_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});