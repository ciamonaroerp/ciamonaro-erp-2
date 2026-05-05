import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY');

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const relatorio = {
      timestamp: new Date().toISOString(),
      verificacoes: {
        banco_dados: {},
        funcoes_backend: [],
        frontend: { referencias_encontradas: [] },
      },
      recomendacoes: [],
      seguro_deletar: true,
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BANCO DE DADOS
    // ═══════════════════════════════════════════════════════════════════════

    // 1.1: Verificar se coluna existe
    const { data: columns } = await supabase.rpc('get_table_columns', {
      table_name: 'produto_comercial',
      schema_name: 'public',
    }).catch(() => ({ data: [] }));

    const temColuna = columns?.some(c => c.column_name === 'codigo');
    relatorio.verificacoes.banco_dados.coluna_existe = temColuna;

    if (!temColuna) {
      return Response.json({
        ...relatorio,
        recomendacoes: ['Coluna já foi deletada'],
        seguro_deletar: false,
      });
    }

    // 1.2: Verificar foreign keys referenciando a coluna
    const { data: fks } = await supabase.rpc('get_foreign_keys', {
      table_name: 'produto_comercial',
      column_name: 'codigo',
    }).catch(() => ({ data: [] }));

    relatorio.verificacoes.banco_dados.foreign_keys = fks || [];
    if (fks?.length > 0) {
      relatorio.seguro_deletar = false;
      relatorio.recomendacoes.push(
        `BLOQUEADOR: ${fks.length} foreign key(s) referencia(m) a coluna 'codigo': ${fks.map(f => f.constraint_name).join(', ')}`
      );
    }

    // 1.3: Verificar triggers
    const { data: triggers } = await supabase
      .rpc('get_triggers', { table_name: 'produto_comercial' })
      .catch(() => ({ data: [] }));

    relatorio.verificacoes.banco_dados.triggers = triggers || [];
    if (triggers?.length > 0) {
      relatorio.recomendacoes.push(
        `AVISO: ${triggers.length} trigger(s) na tabela: ${triggers.map(t => t.trigger_name).join(', ')}`
      );
    }

    // 1.4: Verificar índices
    const { data: indexes } = await supabase
      .rpc('get_indexes', { table_name: 'produto_comercial', column_name: 'codigo' })
      .catch(() => ({ data: [] }));

    relatorio.verificacoes.banco_dados.indexes = indexes || [];
    if (indexes?.length > 0) {
      relatorio.recomendacoes.push(
        `AVISO: ${indexes.length} índice(s) usa(m) a coluna 'codigo': ${indexes.map(i => i.indexname).join(', ')}`
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. FUNÇÕES BACKEND
    // ═══════════════════════════════════════════════════════════════════════

    // Lista de funções que já foram auditadas/corrigidas
    const FUNCOES_AUDITADAS = [
      'sincronizarTabelaPrecos',
      'produtoComercialCRUD',
      'validarStatusRendimento',
      'recalcularComposicaoCustos',
      'orcamentoCRUD',
    ];

    // Funções que devem ser verificadas manualmente (mencionam produto_comercial)
    const FUNCOES_CRITICAS = [
      'listProdutosComerciaisOrdenados',
      'produtoService',
      'produtoRendimentosCRUD',
      'sincronizarStatusUsuarios',
      'marcarTabelaPrecosComInativo',
      'ultimoPrecoCache',
      'recalcularCustoCache',
    ];

    relatorio.verificacoes.funcoes_backend = {
      auditadas_e_corrigidas: FUNCOES_AUDITADAS,
      pendentes_verificacao: FUNCOES_CRITICAS,
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 3. VERIFICAR SE TABELAS RELACIONADAS USAM 'codigo' vs 'codigo_produto'
    // ═══════════════════════════════════════════════════════════════════════

    const { data: syncTableCheck } = await supabase
      .from('tabela_precos_sync')
      .select('codigo_produto')
      .limit(1);

    relatorio.verificacoes.banco_dados.tabela_precos_sync_usa_codigo_produto = !!syncTableCheck;

    // ═══════════════════════════════════════════════════════════════════════
    // 4. RESUMO E RECOMENDAÇÃO
    // ═══════════════════════════════════════════════════════════════════════

    if (relatorio.verificacoes.banco_dados.foreign_keys.length === 0 &&
        relatorio.verificacoes.banco_dados.indexes.length === 0) {
      relatorio.recomendacoes.push('✅ Nenhuma dependência crítica encontrada no banco.');
    } else {
      relatorio.seguro_deletar = false;
    }

    if (FUNCOES_CRITICAS.length > 0) {
      relatorio.recomendacoes.push(
        `⚠️ ${FUNCOES_CRITICAS.length} funções pendentes de verificação manual`
      );
    }

    relatorio.recomendacoes.push(
      relatorio.seguro_deletar
        ? '✅ SEGURO: Pode deletar a coluna após confirmar que nenhuma função crítica usa "codigo"'
        : '❌ NÃO SEGURO: Existem dependências. Resolva os bloqueadores antes de deletar.'
    );

    return Response.json(relatorio);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});