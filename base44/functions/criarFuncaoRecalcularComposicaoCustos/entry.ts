import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Executa a criação da função SQL
    const sqlFunction = `
CREATE OR REPLACE FUNCTION fn_recalcular_composicao_custos(p_id uuid)
RETURNS void AS $$
DECLARE
  v_acabamentos jsonb;
  v_itens_adicionais jsonb;
  v_personalizacoes jsonb;
  v_custo_acab numeric := 0;
  v_soma_itens numeric := 0;
  v_custo_pers numeric := 0;
  v_item record;
BEGIN
  -- Busca os JSONBs do item
  SELECT acabamentos, itens_adicionais, personalizacoes
  INTO v_acabamentos, v_itens_adicionais, v_personalizacoes
  FROM orcamento_itens
  WHERE id = p_id;

  -- Soma acabamentos
  IF v_acabamentos IS NOT NULL AND jsonb_array_length(v_acabamentos) > 0 THEN
    SELECT COALESCE(SUM((item->>'valor')::numeric), 0)
    INTO v_custo_acab
    FROM jsonb_array_elements(v_acabamentos) AS item;
  END IF;

  -- Soma itens adicionais
  IF v_itens_adicionais IS NOT NULL AND jsonb_array_length(v_itens_adicionais) > 0 THEN
    SELECT COALESCE(SUM((item->>'valor')::numeric), 0)
    INTO v_soma_itens
    FROM jsonb_array_elements(v_itens_adicionais) AS item;
  END IF;

  -- Soma personalizações (custo_personalizacao é o valor_variavel)
  IF v_personalizacoes IS NOT NULL AND jsonb_array_length(v_personalizacoes) > 0 THEN
    SELECT COALESCE(SUM((item->>'valor_variavel')::numeric), 0)
    INTO v_custo_pers
    FROM jsonb_array_elements(v_personalizacoes) AS item;
  END IF;

  -- Atualiza os custos na tabela
  UPDATE orcamento_itens
  SET 
    custo_acabamento = v_custo_acab,
    soma_itens_adicionais = v_soma_itens,
    custo_personalizacao = v_custo_pers,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
    `;

    const result = await base44.functions.invoke('supabaseCRUD', {
      action: 'raw_sql',
      sql: sqlFunction,
    });

    return Response.json({
      success: true,
      message: 'Função SQL criada com sucesso',
      result: result?.data,
    });
  } catch (error) {
    console.error('[criarFuncaoRecalcularComposicaoCustos]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});