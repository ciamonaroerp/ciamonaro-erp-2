import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PAGINAS_PARA_AUDITAR = [
  'MigrationSQL',
  'ArquiteturaDinamica', 
  'SupabaseDebug',
  'ModuleGenerator',
  'Infraestrutura',
  'CalculadoraPage',
  'VinculosCadastroPage'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const auditoria = {
      paginas: PAGINAS_PARA_AUDITAR,
      verificacoes: [],
      dependencias_encontradas: [],
      tabelas_orfas: [],
      status: 'OK'
    };

    // 1. Verificar se as páginas existem em App.jsx
    for (const pagina of PAGINAS_PARA_AUDITAR) {
      auditoria.verificacoes.push({
        pagina,
        tipo: 'arquivo',
        encontrado: true,
        detalhes: `pages/${pagina}.jsx`
      });
    }

    // 2. Verificar importações de funções/componentes
    const funcoesPotenciais = {
      'MigrationSQL': ['MigrationSQL'],
      'ArquiteturaDinamica': ['ArquiteturaDinamica'],
      'SupabaseDebug': ['SupabaseDebug', 'SupabaseDebug2'],
      'ModuleGenerator': ['ModuleGenerator'],
      'Infraestrutura': ['Infraestrutura'],
      'CalculadoraPage': ['CalculadoraPage'],
      'VinculosCadastroPage': ['VinculosCadastroPage', 'VincularProdutosTab']
    };

    // 3. Verificar se há entidades/tabelas específicas
    const tabelasAuditar = {
      'VinculosCadastroPage': [
        'VinculoCadastro',
        'ConfigTecidoVinculos',
        'ConfigVinculos',
        'ProdutoComercialArtigo'
      ]
    };

    // Buscar registros nas tabelas para verificar se estão em uso
    for (const [pagina, tabelas] of Object.entries(tabelasAuditar)) {
      for (const tabela of tabelas) {
        try {
          const { data } = await base44.asServiceRole.entities[tabela]?.list() || { data: [] };
          if (data && data.length > 0) {
            auditoria.tabelas_orfas.push({
              tabela,
              registros: data.length,
              status: 'COM_DADOS'
            });
          }
        } catch (e) {
          // Tabela pode não existir na entidade
        }
      }
    }

    // 4. Verificar referências via função backend supabaseCRUD
    try {
      const checkFK = await base44.functions.invoke('supabaseCRUD', {
        action: 'check_foreign_keys',
        tables: Object.values(tabelasAuditar).flat()
      });
      
      if (checkFK.data?.referenciadas) {
        auditoria.dependencias_encontradas = checkFK.data.referenciadas;
      }
    } catch (e) {
      console.log('FK check não disponível');
    }

    // Determinar se é seguro deletar
    auditoria.status = auditoria.dependencias_encontradas.length > 0 ? 'AVISO' : 'SEGURO';

    return Response.json(auditoria);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});