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

  // Notas com todos os campos dos itens
  const { data: notas } = await supabase
    .from('nota_fiscal_importada')
    .select('id, numero_nf, emitente_cnpj, itens')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  const notasInfo = (notas || []).map(n => {
    let itens;
    try { itens = typeof n.itens === 'string' ? JSON.parse(n.itens) : n.itens; } catch { itens = []; }
    return {
      numero_nf: n.numero_nf,
      emitente_cnpj: n.emitente_cnpj,
      itens: (itens || []).map((it, i) => ({
        idx: i + 1,
        descricao_base: it.descricao_base,
        descricao_complementar: it.descricao_complementar,
        codigo_produto_xml: it.codigo_produto,
        codigo_unico_salvo: it.codigo_unico,
        status_vinculo: it.status_vinculo,
        quantidade: it.quantidade,
      }))
    };
  });

  // config_vinculos completo
  const { data: vinculos } = await supabase
    .from('config_vinculos')
    .select('*')
    .eq('empresa_id', empresa_id)
    .is('deleted_at', null);

  return Response.json({ notas: notasInfo, vinculos });
});