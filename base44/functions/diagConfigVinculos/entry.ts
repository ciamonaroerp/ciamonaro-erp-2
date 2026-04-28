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
    const { empresa_id } = body;

    const { data: vinculos, error } = await supabaseAdmin
      .from('config_vinculos')
      .select('*')
      .eq('empresa_id', empresa_id)
      .is('deleted_at', null);

    if (error) throw error;

    const stats = {
      total: vinculos.length,
      campos_criticos: {
        artigo_nome_vazio: 0,
        cor_nome_vazio: 0,
        descricao_complementar_vazio: 0,
        descricao_base_vazio: 0,
        descricao_unificada_vazio: 0,
        descricao_comercial_unificada_vazio: 0,
      },
      por_codigo: {}
    };

    for (const v of vinculos) {
      if (!v.artigo_nome) stats.campos_criticos.artigo_nome_vazio++;
      if (!v.cor_nome) stats.campos_criticos.cor_nome_vazio++;
      if (!v.descricao_complementar) stats.campos_criticos.descricao_complementar_vazio++;
      if (!v.descricao_base) stats.campos_criticos.descricao_base_vazio++;
      if (!v.descricao_unificada) stats.campos_criticos.descricao_unificada_vazio++;
      if (!v.descricao_comercial_unificada) stats.campos_criticos.descricao_comercial_unificada_vazio++;

      if (!stats.por_codigo[v.codigo_unico]) {
        stats.por_codigo[v.codigo_unico] = {
          artigo: v.artigo_nome,
          cor: v.cor_nome,
          descricao_complementar: v.descricao_complementar,
          descricao_base: v.descricao_base,
          descricao_unificada: v.descricao_unificada,
          descricao_comercial_unificada: v.descricao_comercial_unificada,
        };
      }
    }

    return Response.json({ stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});