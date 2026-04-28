import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Mapeamento de conflitos conhecidos do sistema
const CONFLITOS_CONHECIDOS = {
  orcamento_itens: {
    cor: { esperado: 'nome_cor', encontrado: 'cor_nome', severidade: 'CRITICA' },
  },
  tabela_precos_sync: {
    cor: { esperado: 'nome_cor', encontrado: 'cor_nome', severidade: 'CRITICA' },
    linha: { esperado: 'nome_linha_comercial', encontrado: 'linha_nome', severidade: 'CRITICA' },
  },
  crm_oportunidades: {
    cor: { esperado: 'nome_cor', encontrado: 'cor_nome', severidade: 'ALTA' },
  },
  config_tecido_cor: {
    cor: { esperado: 'nome_cor', encontrado: 'cor_nome', severidade: 'ALTA' },
  },
  produto_comercial_artigo: {
    artigo: { esperado: 'nome_artigo', encontrado: 'artigo_nome', severidade: 'ALTA' },
  },
};

const COMPONENTES_AFETADOS = {
  'cor_nome': [
    'components/comercial/orcamentos/AbaConfiguracaoOrcamento.jsx',
    'components/comercial/orcamentos/ModalItemProduto.jsx',
    'components/comercial/orcamentos/OrcamentoResumoFita.jsx',
    'components/comercial/orcamentos/orcamentoUtils.jsx',
    'components/crm/CRMNovaOportunidadeModal.jsx',
    'components/fiscal/CodigoUnicoTab.jsx',
  ],
  'artigo_nome': [
    'components/fiscal/CodigoUnicoTab.jsx',
  ],
  'linha_nome': [
    'components/comercial/orcamentos/ModalItemProduto.jsx',
  ],
};

const FUNCTIONS_AFETADAS = [
  'orcamentoItensCRUD',
  'sincronizarTabelaPrecos',
  'produtoComercialCRUD',
  'orcamentoUtils',
  'modalItemProduto',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const relatorio = {
      timestamp: new Date().toISOString(),
      resumo: {
        total_tabelas_afetadas: Object.keys(CONFLITOS_CONHECIDOS).length,
        total_conflitos: 0,
        conflitos_criticos: 0,
        conflitos_altos: 0,
        componentes_afetados: 0,
        functions_afetadas: FUNCTIONS_AFETADAS.length,
      },
      padrao_esperado: {
        artigo: 'nome_artigo',
        cor: 'nome_cor',
        linha: 'nome_linha_comercial',
      },
      conflitos_por_tabela: {},
      sql_migracao: [],
      componentes_frontend: {},
      functions_backend: FUNCTIONS_AFETADAS,
      recomendacoes: [],
    };

    // Processar conflitos conhecidos
    Object.entries(CONFLITOS_CONHECIDOS).forEach(([tabela, conflitos]) => {
      relatorio.conflitos_por_tabela[tabela] = {};

      Object.entries(conflitos).forEach(([tipo, config]) => {
        const { esperado, encontrado, severidade } = config;

        relatorio.conflitos_por_tabela[tabela][tipo] = {
          esperado,
          encontrado,
          severidade,
          sql: `ALTER TABLE "${tabela}" RENAME COLUMN "${encontrado}" TO "${esperado}";`,
        };

        relatorio.sql_migracao.push({
          tabela,
          tipo,
          de: encontrado,
          para: esperado,
          sql: `ALTER TABLE "${tabela}" RENAME COLUMN "${encontrado}" TO "${esperado}";`,
          status: 'PENDENTE',
          severidade,
        });

        relatorio.resumo.total_conflitos++;
        if (severidade === 'CRITICA') relatorio.resumo.conflitos_criticos++;
        if (severidade === 'ALTA') relatorio.resumo.conflitos_altos++;
      });
    });

    // Mapear componentes afetados
    Object.entries(COMPONENTES_AFETADOS).forEach(([coluna, arquivos]) => {
      relatorio.componentes_frontend[coluna] = arquivos;
      relatorio.resumo.componentes_afetados += arquivos.length;
    });

    // Gerar recomendações
    relatorio.recomendacoes = [
      {
        prioridade: 'CRITICA',
        ordem: 1,
        titulo: 'Renomear colunas em tabelas críticas',
        descricao: `${relatorio.resumo.conflitos_criticos} conflito(s) crítico(s) encontrado(s)`,
        acao: 'Executar scripts SQL imediatamente',
        scripts_sql: relatorio.sql_migracao
          .filter(m => m.severidade === 'CRITICA')
          .map(m => m.sql),
        tabelas: relatorio.sql_migracao
          .filter(m => m.severidade === 'CRITICA')
          .map(m => m.tabela),
      },
      {
        prioridade: 'ALTA',
        ordem: 2,
        titulo: 'Renomear colunas em tabelas adicionais',
        descricao: `${relatorio.resumo.conflitos_altos} conflito(s) alto(s) encontrado(s)`,
        acao: 'Executar scripts SQL após críticos',
        scripts_sql: relatorio.sql_migracao
          .filter(m => m.severidade === 'ALTA')
          .map(m => m.sql),
      },
      {
        prioridade: 'ALTA',
        ordem: 3,
        titulo: 'Atualizar backend functions',
        descricao: `${FUNCTIONS_AFETADAS.length} function(s) precisam validação`,
        functions: FUNCTIONS_AFETADAS,
        acao: 'Revisar e atualizar referências de colunas nas functions',
      },
      {
        prioridade: 'ALTA',
        ordem: 4,
        titulo: 'Atualizar componentes React frontend',
        descricao: `${relatorio.resumo.componentes_afetados} arquivo(s) componente afetado(s)`,
        componentes: Object.entries(COMPONENTES_AFETADOS).flatMap(([coluna, arquivos]) =>
          arquivos.map(arquivo => ({ coluna: coluna, arquivo }))
        ),
        acao: 'Procurar e substituir referências das colunas alternativas',
      },
      {
        prioridade: 'MÉDIA',
        ordem: 5,
        titulo: 'Validar integridade de dados',
        descricao: 'Após renomeação, validar que dados foram preservados',
        acao: 'Executar queries de validação nos dados',
      },
      {
        prioridade: 'BAIXA',
        ordem: 6,
        titulo: 'Executar testes',
        descricao: 'Testar fluxos de orçamentos, CRM e fiscal',
        acao: 'Teste manual de criar/editar orçamentos, oportunidades CRM e códigos únicos',
      },
    ];

    console.log(`[auditoriaNomenclaturaCompleta] ${relatorio.resumo.total_conflitos} conflitos mapeados`);

    return Response.json(relatorio);
  } catch (error) {
    console.error('[auditoriaNomenclaturaCompleta]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});