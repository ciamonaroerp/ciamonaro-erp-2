import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PADROES_NOMEACAO = {
  // Padrão esperado: nome_entidade (ex: nome_cor, nome_produto)
  nome: /^nome_[a-z_]+$/,
  // Padrão alternativo: entidade_nome (ex: cor_nome, produto_nome)
  invertido: /^[a-z_]+_nome$/,
  // Padrão de código: codigo_entidade (ex: codigo_cor, codigo_produto)
  codigo: /^codigo_[a-z_]+$/,
};

const CAMPOS_CRITICOS = {
  cor: { esperado: 'cor_nome', alternativas: ['nome_cor'] },
  linha: { esperado: 'linha_nome', alternativas: ['nome_linha', 'nome_linha_comercial'] },
  produto: { esperado: 'produto_id', alternativas: ['id_produto'] },
  artigo: { esperado: 'artigo_nome', alternativas: ['nome_artigo', 'nome_artigo_comercial'] },
};

const TABELAS_CRITICAS = [
  'tabela_precos_sync',
  'orcamento_itens',
  'produto_comercial_artigo',
  'config_tecido_cor',
  'config_tecido_artigo',
  'config_tecido_linha_comercial',
  'crm_oportunidades',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = base44.asServiceRole;
    const relatorio = {
      timestamp: new Date().toISOString(),
      conflitos: [],
      pendencias: [],
      recomendacoes: [],
      resumo: {},
    };

    // 1. Auditar tabelas críticas
    for (const tabela of TABELAS_CRITICAS) {
      const { data: schema, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', tabela)
        .eq('table_schema', 'public');

      if (error || !schema) {
        relatorio.pendencias.push({
          tabela,
          erro: `Não foi possível auditar: ${error?.message || 'tabela não encontrada'}`,
        });
        continue;
      }

      const colunas = schema.map(col => col.column_name);
      const conflitosTabela = identificarConflitos(tabela, colunas);

      if (conflitosTabela.length > 0) {
        relatorio.conflitos.push({
          tabela,
          problemas: conflitosTabela,
        });
      }
    }

    // 2. Validar consistência entre tabelas críticas
    const validacoes = await validarConsistencia(supabase);
    if (validacoes.length > 0) {
      relatorio.conflitos.push({
        tabela: 'cross-tabela',
        problemas: validacoes,
      });
    }

    // 3. Gerar resumo e recomendações
    relatorio.resumo = {
      total_conflitos: relatorio.conflitos.reduce((sum, c) => sum + c.problemas.length, 0),
      tabelas_afetadas: relatorio.conflitos.length,
      pendencias: relatorio.pendencias.length,
    };

    relatorio.recomendacoes = gerarRecomendacoes(relatorio.conflitos);

    return Response.json(relatorio);
  } catch (error) {
    console.error('[auditoriaNomenclaturaTabelas]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function identificarConflitos(tabela, colunas) {
  const conflitos = [];

  // Procurar por padrões inconsistentes
  for (const [entidade, config] of Object.entries(CAMPOS_CRITICOS)) {
    const esperado = config.esperado;
    const alternativas = config.alternativas;
    const encontradas = colunas.filter(col => 
      alternativas.includes(col) || col === esperado
    );

    if (encontradas.length > 1) {
      // Conflito: múltiplas colunas para o mesmo conceito
      conflitos.push({
        tipo: 'CONFLITO_NOMEACAO',
        entidade,
        esperado,
        encontradas,
        severidade: 'ALTA',
        descricao: `Múltiplas colunas para ${entidade}: ${encontradas.join(', ')}`,
      });
    } else if (encontradas.length === 1 && encontradas[0] !== esperado) {
      // Aviso: coluna com nome alternativo
      conflitos.push({
        tipo: 'NOMEACAO_NAO_PADRAO',
        entidade,
        esperado,
        encontrado: encontradas[0],
        severidade: 'MEDIA',
        descricao: `Coluna usa nome alternativo: ${encontradas[0]} (esperado: ${esperado})`,
      });
    }
  }

  // Procurar por orfãos (colunas tipo "nome_*" sem correspondente)
  const orfaos = colunas.filter(col => {
    if (PADROES_NOMEACAO.nome.test(col) || PADROES_NOMEACAO.invertido.test(col)) {
      const entidade = col.replace(/^nome_/, '').replace(/_nome$/, '');
      return !colunas.some(c => c.includes(entidade) && c !== col);
    }
    return false;
  });

  if (orfaos.length > 0) {
    conflitos.push({
      tipo: 'COLUNAS_ORFAS',
      colunas: orfaos,
      severidade: 'BAIXA',
      descricao: `Colunas sem relacionamento aparente: ${orfaos.join(', ')}`,
    });
  }

  return conflitos;
}

async function validarConsistencia(supabase) {
  const problemas = [];

  // Validar se orcamento_itens usa cor_nome (não nome_cor)
  const { data: orcItems } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'orcamento_itens')
    .eq('table_schema', 'public');

  if (orcItems) {
    const nomes = orcItems.map(c => c.column_name);
    if (nomes.includes('nome_cor') && nomes.includes('cor_nome')) {
      problemas.push({
        tipo: 'DUPLA_COLUNA',
        tabela: 'orcamento_itens',
        colunas: ['nome_cor', 'cor_nome'],
        severidade: 'CRITICA',
        descricao: 'Ambas cor_nome e nome_cor existem - remova uma',
      });
    } else if (nomes.includes('nome_cor')) {
      problemas.push({
        tipo: 'MIGRACAO_PENDENTE',
        tabela: 'orcamento_itens',
        coluna: 'nome_cor',
        esperada: 'cor_nome',
        severidade: 'ALTA',
        descricao: 'Coluna nome_cor deve ser renomeada para cor_nome',
      });
    }
  }

  // Validar tabela_precos_sync
  const { data: tabelaPrecos } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'tabela_precos_sync')
    .eq('table_schema', 'public');

  if (tabelaPrecos) {
    const nomes = tabelaPrecos.map(c => c.column_name);
    if (!nomes.includes('linha_nome') || !nomes.includes('cor_nome')) {
      problemas.push({
        tipo: 'COLUNA_FALTANTE',
        tabela: 'tabela_precos_sync',
        colunas_faltantes: [
          !nomes.includes('linha_nome') ? 'linha_nome' : null,
          !nomes.includes('cor_nome') ? 'cor_nome' : null,
        ].filter(Boolean),
        severidade: 'CRITICA',
        descricao: 'Colunas essenciais faltam em tabela_precos_sync',
      });
    }
  }

  return problemas;
}

function gerarRecomendacoes(conflitos) {
  const recomendacoes = [];

  const criticos = conflitos.flatMap(c => c.problemas).filter(p => p.severidade === 'CRITICA');
  const altos = conflitos.flatMap(c => c.problemas).filter(p => p.severidade === 'ALTA');

  if (criticos.length > 0) {
    recomendacoes.push({
      prioridade: 'CRITICA',
      acao: 'Resolver imediatamente',
      detalhes: `${criticos.length} problema(s) crítico(s) encontrado(s)`,
    });
  }

  if (altos.length > 0) {
    recomendacoes.push({
      prioridade: 'ALTA',
      acao: 'Planejar migração de dados',
      detalhes: `${altos.length} incompatibilidade(s) de nomenclatura`,
    });
  }

  recomendacoes.push({
    prioridade: 'GERAL',
    acao: 'Padronizar naming convention',
    detalhes: 'Usar padrão: entidade_atributo (ex: cor_nome, linha_nome, produto_id)',
  });

  return recomendacoes;
}