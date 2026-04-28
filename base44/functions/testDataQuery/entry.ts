import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const empresaId = Deno.env.get("VITE_EMPRESA_ID");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const [prodRes, servRes, acabRes] = await Promise.all([
      supabase.from('produto_comercial').select('*').eq('empresa_id', empresaId),
      supabase.from('servicos').select('*').eq('empresa_id', empresaId),
      supabase.from('config_acabamentos').select('*').eq('empresa_id', empresaId),
    ]);

    return Response.json({
      empresa_id: empresaId,
      produtos: prodRes.data || [],
      servicos: servRes.data || [],
      acabamentos: acabRes.data || [],
      erros: [prodRes.error, servRes.error, acabRes.error].filter(Boolean),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});