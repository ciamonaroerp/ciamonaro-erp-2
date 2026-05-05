import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    // Função auxiliar para executar queries no Supabase
    const querySupabase = async (sql) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      });
      return response.json();
    };

    const auditResult = {
      column_exists: true,
      referenced_in_tables: [],
      referenced_in_functions: [],
      safe_to_delete: false,
      recommendations: []
    };

    // Verifica outras tabelas que podem referenciar produto_comercial.codigo
    const tablesToCheck = [
      'tabela_precos_sync',
      'orcamento_itens',
      'produto_rendimento_valores',
      'produto_composicao',
      'estoque_produtos',
      'pedidos_itens',
      'nota_fiscal_itens',
      'ordens_producao'
    ];

    for (const table of tablesToCheck) {
      try {
        const { data } = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=1`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          }
        }).then(r => r.json());

        // Se a query funcionou, a tabela existe
        if (Array.isArray(data)) {
          auditResult.referenced_in_tables.push({
            table: table,
            status: 'exists',
            note: 'Verificar se usa codigo ou codigo_produto'
          });
        }
      } catch (err) {
        // Tabela não existe, ignore
      }
    }

    // Verifica referências em funções backend
    const backendFunctions = [
      'sincronizarTabelaPrecos',
      'validarStatusRendimento',
      'recalcularComposicaoCustos',
      'orcamentoCRUD',
      'produtoComercialCRUD'
    ];

    auditResult.referenced_in_functions = backendFunctions.map(f => ({
      function: f,
      note: 'Revisar manualmente se usa codigo ou codigo_produto'
    }));

    // Recomendações
    auditResult.recommendations = [
      'Executar busca em todo o repositório por "p.codigo" ou ".codigo"',
      'Verificar todas as views que consultam produto_comercial',
      'Validar integrações externas que possam usar codigo como chave',
      'Após verificar tudo, executar: ALTER TABLE produto_comercial DROP COLUMN codigo;'
    ];

    auditResult.safe_to_delete = auditResult.referenced_in_tables.length === 0 && 
                                  auditResult.referenced_in_functions.length === 0;

    return Response.json(auditResult);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});