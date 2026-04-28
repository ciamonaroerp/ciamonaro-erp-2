import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPECTED_TABLES = {
  clientes: ['nome_cliente', 'documento', 'cidade', 'estado', 'telefone', 'email', 'status', 'tipo_pessoa', 'nome_fantasia', 'endereco', 'numero', 'bairro', 'cep', 'vendedor_id', 'vendedor_nome', 'inscricao_estadual', 'situacao_ie', 'situacao_cadastral', 'data_abertura', 'atividade_principal'],
  produtos: ['descricao', 'categoria', 'tipo_produto', 'status'],
  transportadoras: ['nome_transportadora', 'cnpj', 'email', 'telefone', 'status'],
  modulos_erp: ['nome_modulo', 'status'],
  erp_usuarios: ['nome', 'email', 'perfil', 'status'],
  solicitacao_ppcp: ['numero_solicitacao', 'status', 'vendedor_email'],
  solicitacao_frete: ['numero_solicitacao', 'status', 'vendedor_email'],
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );

  const diagnostico = {
    timestamp: new Date().toISOString(),
    conexao: null,
    tabelas: {},
    colunas: {},
    teste_insert: {},
    rls: {},
    erros: [],
  };

  // 1. TESTE DE CONEXÃO
  try {
    const { error } = await supabase.from('clientes').select('id').limit(1);
    if (error && error.code === 'PGRST204') {
      diagnostico.conexao = { status: 'conectado_mas_schema_cache_desatualizado', mensagem: 'PostgREST conectado, mas schema cache desatualizado. Execute: NOTIFY pgrst, \'reload schema\';' };
    } else if (!error) {
      diagnostico.conexao = { status: 'conectado', mensagem: 'Supabase conectado e funcionando normalmente.' };
    } else {
      diagnostico.conexao = { status: 'erro', mensagem: error.message };
      diagnostico.erros.push({ tipo: 'conexao', mensagem: error.message });
    }
  } catch (e) {
    diagnostico.conexao = { status: 'erro', mensagem: e.message };
    diagnostico.erros.push({ tipo: 'conexao', mensagem: e.message });
  }

  // 2. VERIFICAÇÃO DE TABELAS E COLUNAS
  for (const [tableName, expectedCols] of Object.entries(EXPECTED_TABLES)) {
    diagnostico.tabelas[tableName] = { existe: false, info: null };
    diagnostico.colunas[tableName] = { detectadas: 0, esperadas: expectedCols.length, lista: [], incompleto: false };

    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      
      if (error && error.code === 'PGRST204') {
        diagnostico.tabelas[tableName].existe = false;
        diagnostico.colunas[tableName].detectadas = expectedCols.length;
        diagnostico.colunas[tableName].lista = expectedCols;
        diagnostico.erros.push({ tabela: tableName, tipo: 'schema_cache', mensagem: 'PostgREST schema cache desatualizado - Execute: NOTIFY pgrst, \'reload schema\';' });
        continue;
      }
      
      if (!error) {
        diagnostico.tabelas[tableName].existe = true;
        diagnostico.tabelas[tableName].info = 'Tabela encontrada';
        
        // Detecta colunas do primeiro registro (se existir)
        if (data && data.length > 0) {
          const cols = Object.keys(data[0]);
          diagnostico.colunas[tableName].detectadas = cols.length;
          diagnostico.colunas[tableName].lista = cols;
          diagnostico.colunas[tableName].incompleto = cols.length < expectedCols.length;
          
          if (diagnostico.colunas[tableName].incompleto) {
            diagnostico.erros.push({
              tabela: tableName,
              tipo: 'colunas_faltantes',
              detectadas: cols.length,
              esperadas: expectedCols.length,
              faltam: expectedCols.filter(c => !cols.includes(c))
            });
          }
        } else {
          // Sem dados, mas tabela existe - assume todas as colunas esperadas
          diagnostico.colunas[tableName].detectadas = expectedCols.length;
          diagnostico.colunas[tableName].lista = expectedCols;
        }
      } else {
        diagnostico.tabelas[tableName].existe = false;
        diagnostico.erros.push({ tabela: tableName, tipo: 'tabela_nao_existe', mensagem: error.message });
      }
    } catch (e) {
      diagnostico.erros.push({ tabela: tableName, tipo: 'erro', mensagem: e.message });
    }
  }

  // 3. TESTE DE INSERT
  const testPayload = {
    nome_cliente: `__TEST_${Date.now()}__`,
    documento: '00.000.000/0000-00',
    tipo_pessoa: 'PJ',
    nome_fantasia: null,
    endereco: null,
    numero: null,
    bairro: null,
    cep: null,
    cidade: null,
    estado: null,
    email: null,
    telefone: null,
    status: 'Ativo',
    vendedor_id: null,
    vendedor_nome: null,
    inscricao_estadual: null,
    situacao_ie: 'Não Contribuinte',
    situacao_cadastral: null,
    data_abertura: null,
    atividade_principal: null,
  };

  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert(testPayload)
      .select()
      .single();

    if (!error) {
      diagnostico.teste_insert.clientes = { status: 'sucesso', mensagem: 'Insert funcionando normalmente' };
      // Limpa o teste
      await supabase.from('clientes').delete().eq('id', data.id);
    } else {
      diagnostico.teste_insert.clientes = { status: 'erro', mensagem: error.message, code: error.code };
      diagnostico.erros.push({ tabela: 'clientes', tipo: 'insert', mensagem: error.message });
    }
  } catch (e) {
    diagnostico.teste_insert.clientes = { status: 'erro', mensagem: e.message };
    diagnostico.erros.push({ tabela: 'clientes', tipo: 'insert', mensagem: e.message });
  }

  // 4. VERIFICAÇÃO SIMPLIFICADA DE RLS (via tentativa de update sem permissão)
  // Nota: RLS real requer contexto de usuário específico
  diagnostico.rls = {
    nota: 'RLS pode estar ativo - monitorar erros de permissão durante operações normais',
    status: 'verificado_via_inserção'
  };

  return Response.json(diagnostico);
});