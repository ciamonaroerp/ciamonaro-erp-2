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

    // Detecta empresa_id real buscando o primeiro registro de modulos_erp
    const { data: modulos } = await supabase.from('modulos_erp').select('empresa_id').limit(1);
    const empresaId = modulos?.[0]?.empresa_id;
    if (!empresaId) return Response.json({ error: 'empresa_id não encontrada' }, { status: 500 });

    // Limpa dados antigos com empresa_id errada
    await supabase.from('produto_comercial').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('servicos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('config_acabamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const now = new Date().toISOString();

    const [prodRes, servRes, acabRes] = await Promise.all([
      supabase.from('produto_comercial').insert([
        { empresa_id: empresaId, nome_produto: "Camiseta Básica", descricao: "Camiseta simples de algodão", status: "Ativo", created_date: now },
        { empresa_id: empresaId, nome_produto: "Camiseta Premium", descricao: "Camiseta premium de algodão egípcio", status: "Ativo", created_date: now },
        { empresa_id: empresaId, nome_produto: "Polo Executiva", descricao: "Polo para ambiente corporativo", status: "Ativo", created_date: now },
      ]).select(),
      supabase.from('servicos').insert([
        { empresa_id: empresaId, nome_servico: "Silkscreen", descricao: "Estamparia silkscreen", status: "Ativo", created_date: now },
        { empresa_id: empresaId, nome_servico: "Sublimação", descricao: "Impressão sublimada", status: "Ativo", created_date: now },
        { empresa_id: empresaId, nome_servico: "Bordado", descricao: "Bordado computadorizado", status: "Ativo", created_date: now },
      ]).select(),
      supabase.from('config_acabamentos').insert([
        { empresa_id: empresaId, codigo_acabamento: "A011", nome_acabamento: "Costura Overlock", descricao: "Costura com acabamento overlock", dependencia: false },
        { empresa_id: empresaId, codigo_acabamento: "A022", nome_acabamento: "Bainha Dupla", descricao: "Bainha dupla com costura reforçada", dependencia: false },
        { empresa_id: empresaId, codigo_acabamento: "A033", nome_acabamento: "Viés Colorido", descricao: "Viés em cores diferenciadas", dependencia: true },
      ]).select(),
    ]);

    return Response.json({
      sucesso: true,
      empresa_id: empresaId,
      produtos: prodRes.data?.length || 0,
      servicos: servRes.data?.length || 0,
      acabamentos: acabRes.data?.length || 0,
      erros: [prodRes.error, servRes.error, acabRes.error].filter(Boolean),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});