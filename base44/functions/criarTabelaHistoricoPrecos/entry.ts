import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await base44.functions.invoke('supabaseCRUD', {
      action: 'raw',
      query: `
        CREATE TABLE IF NOT EXISTS historico_precos_produto (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          empresa_id UUID NOT NULL,
          codigo_produto TEXT,
          codigo_unico TEXT,
          descricao_original TEXT,
          fornecedor_nome TEXT,
          numero_nf TEXT,
          chave_danfe TEXT,
          data_emissao TIMESTAMP,
          valor_unitario NUMERIC(12,4),
          quantidade NUMERIC(12,4),
          valor_total NUMERIC(14,2),
          unidade TEXT,
          criado_em TIMESTAMP DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_historico_codigo_unico ON historico_precos_produto(codigo_unico);
        CREATE INDEX IF NOT EXISTS idx_historico_empresa ON historico_precos_produto(empresa_id);
      `
    });

    return Response.json({ success: true, message: 'Tabela criada com sucesso' });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});