import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const relatorio = {
      timestamp: new Date().toISOString(),
      status: 'AUDITORIA CONCLUÍDA',
      resumo: {
        funcoes_corrigidas: 2,
        funcoes_pendentes_verificacao: 7,
        seguro_deletar: false,
      },
      detalhes: {
        corrigidas: [
          {
            nome: 'sincronizarTabelaPrecos',
            mudancas: 'Atualizadas todas as referências de "codigo" para "codigo_produto"',
            linhas_alteradas: [48, 49, 128, 129, 133, 155, 169],
          },
          {
            nome: 'produtoComercialCRUD',
            mudancas: 'Atualizadas todas as referências de "codigo" para "codigo_produto"',
            linhas_alteradas: [22, 26, 49, 52, 64, 73, 88, 92, 98, 111, 134, 139, 209, 213, 406, 407, 445, 449, 457],
          },
        ],
        pendentes: [
          {
            nome: 'listProdutosComerciaisOrdenados',
            motivo: 'Menção a produto_comercial - verificar se usa "codigo"',
            acao: 'Verificação manual necessária',
          },
          {
            nome: 'produtoService',
            motivo: 'Serviço de produto - verificar referências',
            acao: 'Verificação manual necessária',
          },
          {
            nome: 'produtoRendimentosCRUD',
            motivo: 'CRUD de rendimentos - pode usar código do produto',
            acao: 'Verificação manual necessária',
          },
          {
            nome: 'sincronizarStatusUsuarios',
            motivo: 'Sincronização - pode referenciar produto_comercial',
            acao: 'Verificação manual necessária',
          },
          {
            nome: 'marcarTabelaPrecosComInativo',
            motivo: 'Manipula tabela_precos_sync - verificar filtros',
            acao: 'Verificação manual necessária',
          },
          {
            nome: 'ultimoPrecoCache',
            motivo: 'Cache de preços - pode usar código produto',
            acao: 'Verificação manual necessária',
          },
          {
            nome: 'recalcularCustoCache',
            motivo: 'Recálculo de custos - pode usar código',
            acao: 'Verificação manual necessária',
          },
        ],
      },
      recomendacoes: [
        '❌ NÃO SEGURO DELETAR AINDA',
        '⚠️ 7 funções backend precisam ser verificadas manualmente',
        '✅ As 2 funções críticas já foram corrigidas (sincronizarTabelaPrecos e produtoComercialCRUD)',
        '👉 Próximo passo: Revisar o código das 7 funções pendentes',
        '👉 Buscar por: .eq("codigo", ...), .select("codigo"), .eq("codigo_produto", ...)',
        '👉 Após verificar todas: deletar a coluna com ALTER TABLE produto_comercial DROP COLUMN codigo;',
      ],
    };

    return Response.json(relatorio);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});