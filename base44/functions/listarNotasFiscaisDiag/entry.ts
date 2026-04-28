import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { empresa_id } = await req.json();
  if (!empresa_id) {
    return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });
  }

  // Listar todas as NFs
  const { data: notas, error } = await supabase
    .from('nota_fiscal_importada')
    .select('id, numero_nf, emitente_cnpj, created_date')
    .eq('empresa_id', empresa_id)
    .order('created_date', { ascending: false })
    .limit(20);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ 
    total: notas?.length || 0,
    notas: notas || []
  });
});