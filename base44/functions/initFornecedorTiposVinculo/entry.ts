import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Supabase not configured' }, { status: 500 });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tenta via REST API
    const checkResult = await fetch(`${supabaseUrl}/rest/v1/fornecedor_tipos?select=id,nome,usa_vinculo&limit=1`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });

    if (checkResult.ok) {
      const rows = await checkResult.json();
      // Se a coluna não existir, rows[0].usa_vinculo será undefined
      // Vamos atualizar os tipos conhecidos
      const tipos = {
        'Tecidos': true,
        'Aviamentos': false,
      };

      for (const [nome, usa_vinculo] of Object.entries(tipos)) {
        const updateResp = await fetch(`${supabaseUrl}/rest/v1/fornecedor_tipos?nome=eq.${encodeURIComponent(nome)}`, {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ usa_vinculo })
        });

        if (!updateResp.ok) {
          console.error(`[initFornecedorTiposVinculo] Erro ao atualizar ${nome}:`, await updateResp.text());
        }
      }
    }

    return Response.json({ success: true, message: 'Coluna usa_vinculo inicializada' });
  } catch (error) {
    console.error('[initFornecedorTiposVinculo]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});