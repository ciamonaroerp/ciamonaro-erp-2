/**
 * Normaliza o campo itens da nota_fiscal_importada de string JSON para jsonb array
 * Isso corrige o erro "cannot extract elements from a scalar" no trigger de config_vinculos
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Busca todas as NFe
    const { data: nfes, error: listErr } = await supabase
      .from('nota_fiscal_importada')
      .select('id, itens');

    if (listErr) return Response.json({ error: listErr.message }, { status: 500 });

    let fixed = 0;
    let skipped = 0;
    let errors = [];

    for (const nfe of (nfes || [])) {
      let itens = nfe.itens;

      // Se itens for string, tenta parsear para array
      if (typeof itens === 'string') {
        try {
          const parsed = JSON.parse(itens);
          // Garante que é um array
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          const { error: upErr } = await supabase
            .from('nota_fiscal_importada')
            .update({ itens: arr })
            .eq('id', nfe.id);
          if (upErr) {
            errors.push({ id: nfe.id, error: upErr.message });
          } else {
            fixed++;
          }
        } catch (e) {
          errors.push({ id: nfe.id, error: `Parse failed: ${e.message}` });
        }
      } else {
        skipped++;
      }
    }

    return Response.json({ total: nfes?.length || 0, fixed, skipped, errors });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});