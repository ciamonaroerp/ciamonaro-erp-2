// FUNÇÃO TEMPORÁRIA DE DEBUG — pode ser removida após correção
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

  // Consulta via API REST direta ao PostgREST para columns
  const colRes = await fetch(`${supabaseUrl}/rest/v1/config_tecido_vinculos?limit=0`, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    }
  });
  const colHeaders = Object.fromEntries(colRes.headers.entries());

  // Tenta buscar triggers via pg catalog com fetch direto
  const pgRes = await fetch(`${supabaseUrl}/pg/rest/v1/pg_trigger?tgrelid=eq.config_tecido_vinculos`, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    }
  });
  const pgStatus = pgRes.status;
  const pgBody = await pgRes.text();

  // Testa inserir com codigo_unico explícito e ver o que volta
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Busca artigo para teste
  const { data: artigo } = await supabase.from('config_tecido_artigo').select('id, codigo_artigo').limit(1).single();
  const { data: cor } = await supabase.from('config_tecido_cor').select('id, codigo_cor').limit(1).single();
  const { data: linha } = await supabase.from('config_tecido_linha_comercial').select('id, codigo_linha_comercial').limit(1).single();

  const testeInsert = { artigo, cor, linha, testCode: null };

  if (artigo && cor && linha) {
    const codigoTeste = `TEST-${Date.now()}`;
    const { data: inserted, error: insertError } = await supabase
      .from('config_tecido_vinculos')
      .insert({
        empresa_id: artigo ? (await supabase.from('config_tecido_artigo').select('empresa_id').eq('id', artigo.id).single()).data?.empresa_id : null,
        artigo_id: artigo.id,
        cor_tecido_id: cor.id,
        linha_comercial_id: linha.id,
        codigo_unico: codigoTeste,
      })
      .select()
      .single();

    testeInsert.testCode = codigoTeste;
    testeInsert.savedCode = inserted?.codigo_unico;
    testeInsert.insertError = insertError?.message;
    testeInsert.insertedId = inserted?.id;

    // Limpa o registro de teste
    if (inserted?.id) {
      await supabase.from('config_tecido_vinculos').delete().eq('id', inserted.id);
    }
  }

  return Response.json({
    colHeaders,
    pgStatus,
    pgBody: pgBody.substring(0, 500),
    testeInsert,
  });
});