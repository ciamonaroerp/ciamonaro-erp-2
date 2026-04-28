import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { supabaseUrl, supabaseKey } = JSON.parse(await req.text() || '{}');
    
    // Usa as credenciais do serviço via Supabase
    const supabaseUrl_ = supabaseUrl || Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey_ = supabaseKey || Deno.env.get('SUPABASE_SERVICE_KEY');

    const { createClient } = await import('npm:@supabase/supabase-js@2.39.0');
    const supabase = createClient(supabaseUrl_, supabaseKey_);

    // 1. Lista registros com valor_personalizacao > 0 mas sem personalizacoes ativas
    const { data: registros } = await supabase
      .from('orcamento_itens')
      .select('id, sequencia, quantidade, valor_personalizacao, personalizacoes, tempo_personalizacao, soma_cores, soma_posicoes, deleted_at')
      .gt('valor_personalizacao', 0)
      .order('valor_personalizacao', { ascending: false })
      .limit(20);

    console.log(`[auditarValorPersonalizacao] Encontrados ${registros?.length || 0} registros com valor_personalizacao > 0`);

    const resultado = [];
    
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

        const temPersonalizacao = pers && pers.length > 0;
        const soma_cores = parseFloat(reg.soma_cores) || 0;
        const soma_posicoes = parseFloat(reg.soma_posicoes) || 0;

        resultado.push({
          id: reg.id,
          sequencia: reg.sequencia,
          valor_personalizacao: reg.valor_personalizacao,
          tempo_personalizacao: reg.tempo_personalizacao,
          soma_cores,
          soma_posicoes,
          personalizacoes_count: pers.length,
          temPersonalizacao,
          deveria_ser_zero: !temPersonalizacao && soma_cores === 0 && soma_posicoes === 0,
          deleted_at: reg.deleted_at,
          status: temPersonalizacao ? 'OK' : 'INCONSISTENTE',
        });
      }
    }

    return Response.json({
      registros_analisados: resultado,
      total_inconsistentes: resultado.filter(r => r.status === 'INCONSISTENTE').length,
      recomendacao: 'Verificar se a trigger está calculando valor_personalizacao corretamente quando personalizacoes está vazio ou soma_cores/soma_posicoes são 0',
      instrucoes: 'Verifique os registros com status INCONSISTENTE. Se deveria_ser_zero=true mas valor_personalizacao>0, a trigger está gravando valor residual.',
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});