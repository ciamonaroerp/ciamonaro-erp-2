import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { empresa_id, numero_nf } = body;

    const { data: nota, error } = await supabaseAdmin
      .from('nota_fiscal_importada')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('numero_nf', numero_nf)
      .single();

    if (error || !nota) {
      return Response.json({ error: 'Nota não encontrada' }, { status: 404 });
    }

    let itens = typeof nota.itens === 'string' ? JSON.parse(nota.itens) : nota.itens;
    
    return Response.json({ numero_nf: nota.numero_nf, itens });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});