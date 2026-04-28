Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: "Config missing" }, { status: 500 });
    }

    // Garantir setor_origem e setor_destino sempre presentes
    const payload = {
      ...body,
      setor_origem: body.setor_origem || "COMERCIAL",
      setor_destino: body.setor_destino || "PPCP",
    };

    // Remover colunas que podem não existir no schema
    const { setor_origem, setor_destino, ...payloadLimpo } = payload;

    const response = await fetch(`${supabaseUrl}/rest/v1/solicitacao_ppcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payloadLimpo)
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: errText || `HTTP ${response.status}` }, { status: response.status });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});