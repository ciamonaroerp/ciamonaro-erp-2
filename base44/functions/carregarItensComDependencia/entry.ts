import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, data: [], error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { empresa_id } = body;

    // Carregar acabamentos com dependencia = true
    const { data: acabamentos, error: errAcab } = await supabase
      .from('config_acabamentos')
      .select('id, codigo_acabamento, nome_acabamento')
      .eq('dependencia', true)
      .is('deleted_at', null)
      .order('codigo_acabamento', { ascending: true });

    if (errAcab) throw new Error(errAcab.message);

    // Carregar personalizações com dependencia = true
    const { data: personalizacoes, error: errPerso } = await supabase
      .from('config_personalizacao')
      .select('id, codigo_personalizacao, tipo_personalizacao')
      .eq('dependencia', true)
      .is('deleted_at', null)
      .order('codigo_personalizacao', { ascending: true });

    if (errPerso) throw new Error(errPerso.message);

    const itens = [
      ...(acabamentos || []).map(a => ({
        id: a.id,
        codigo: a.codigo_acabamento,
        nome: a.nome_acabamento,
        origem: 'acabamento',
      })),
      ...(personalizacoes || []).map(p => ({
        id: p.id,
        codigo: p.codigo_personalizacao,
        nome: p.tipo_personalizacao,
        origem: 'personalizacao',
      })),
    ];

    console.log(`[carregarItensComDependencia] empresa=${empresa_id} total=${itens.length}`);
    return Response.json({ success: true, data: itens, error: null });
  } catch (error) {
    console.error('[carregarItensComDependencia] Erro:', error);
    return Response.json({ success: false, data: [], error: error.message }, { status: 500 });
  }
});