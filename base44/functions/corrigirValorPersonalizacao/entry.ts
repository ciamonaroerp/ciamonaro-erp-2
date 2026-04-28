import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { supabaseUrl, supabaseKey } = JSON.parse(await req.text() || '{}');
    
    const supabaseUrl_ = supabaseUrl || Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey_ = supabaseKey || Deno.env.get('SUPABASE_SERVICE_KEY');

    const { createClient } = await import('npm:@supabase/supabase-js@2.39.0');
    const supabase = createClient(supabaseUrl_, supabaseKey_);

    // 1. Identifica registros inconsistentes: valor_personalizacao > 0 mas sem personalizacoes
    const { data: registros } = await supabase
      .from('orcamento_itens')
      .select('id, valor_personalizacao, personalizacoes, soma_cores, soma_posicoes')
      .gt('valor_personalizacao', 0)
      .is('deleted_at', null);

    const inconsistentes = [];
    const corrigidos = [];

    if (registros) {
      for (const reg of registros) {
        const pers = (() => {
          try {
            return Array.isArray(reg.personalizacoes) ? reg.personalizacoes : 
                   typeof reg.personalizacoes === 'string' ? JSON.parse(reg.personalizacoes) : [];
          } catch {
            return [];
          }
        })();

        const soma_cores = parseFloat(reg.soma_cores) || 0;
        const soma_posicoes = parseFloat(reg.soma_posicoes) || 0;

        // Se não tem personalizacoes E soma_cores/soma_posicoes são 0, deveria ser zero
        if (pers.length === 0 && soma_cores === 0 && soma_posicoes === 0) {
          inconsistentes.push({
            id: reg.id,
            valor_atual: reg.valor_personalizacao,
            deveria_ser: 0,
          });

          // Atualiza para 0
          const { error } = await supabase
            .from('orcamento_itens')
            .update({ valor_personalizacao: 0, updated_at: new Date().toISOString() })
            .eq('id', reg.id);

          if (!error) {
            corrigidos.push(reg.id);
            console.log(`[corrigirValorPersonalizacao] Corrigido ID ${reg.id}: ${reg.valor_personalizacao} → 0`);
          } else {
            console.error(`[corrigirValorPersonalizacao] Erro ao corrigir ${reg.id}:`, error.message);
          }
        }
      }
    }

    return Response.json({
      total_inconsistentes_encontrados: inconsistentes.length,
      total_corrigidos: corrigidos.length,
      registros_corrigidos: inconsistentes.map(r => ({ 
        id: r.id, 
        valor_anterior: r.valor_atual, 
        valor_novo: r.deveria_ser 
      })),
      detalhes: inconsistentes.length > 0 
        ? `Encontrados ${inconsistentes.length} registros com valor residual. Corrigidos: ${corrigidos.length}`
        : 'Nenhum registro inconsistente encontrado.',
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});