import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const empresa_id = "73045062-97e0-43b5-b95d-a1be96b4a0f2";

    // Tenta buscar de diferentes tabelas
    const [
      { data: artigos, error: err1 },
      { data: artigosRaw, error: err2 },
      { data: vinculosCfg, error: err3 },
      { data: rendVals, error: err4 },
    ] = await Promise.all([
      supabase.from('produto_comercial_artigo').select('*').eq('empresa_id', empresa_id).limit(3),
      supabase.from('produto_comercial_artigo').select('*').limit(3),
      supabase.from('config_vinculos').select('*').eq('empresa_id', empresa_id).limit(3),
      supabase.from('produto_rendimento_valores').select('*').eq('empresa_id', empresa_id).limit(3),
    ]);

    return Response.json({
      artigos: { data: artigos, error: err1?.message },
      artigosRaw: { data: artigosRaw, error: err2?.message },
      vinculosCfg: { data: vinculosCfg, error: err3?.message },
      rendVals: { data: rendVals, error: err4?.message },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});