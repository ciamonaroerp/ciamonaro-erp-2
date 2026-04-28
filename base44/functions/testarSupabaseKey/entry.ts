Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
  const anonKey = Deno.env.get("VITE_SUPABASE_ANON_KEY");

  // Testa com service key
  const resService = await fetch(`${supabaseUrl}/rest/v1/solicitacaoppcp?limit=1`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });

  // Testa com anon key  
  const resAnon = await fetch(`${supabaseUrl}/rest/v1/solicitacaoppcp?limit=1`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  return Response.json({
    serviceKeyPrefix: serviceKey?.substring(0, 30) + "...",
    anonKeyPrefix: anonKey?.substring(0, 30) + "...",
    sameKey: serviceKey === anonKey,
    serviceKeyResult: resService.status,
    anonKeyResult: resAnon.status,
    serviceKeyBody: await resService.text(),
  });
});