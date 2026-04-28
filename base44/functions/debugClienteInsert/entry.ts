import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );

  // Testa inserção mínima
  const testPayload = {
    nome_cliente: '__DEBUG_TEST__',
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

  const { data, error } = await supabase
    .from('clientes')
    .insert(testPayload)
    .select()
    .single();

  if (!error) {
    // Limpa o registro de teste
    await supabase.from('clientes').delete().eq('id', data.id);
    return Response.json({ success: true, message: 'Insert OK - todas as colunas existem!' });
  }

  // Retorna o erro exato para diagnóstico
  return Response.json({
    success: false,
    error_message: error.message,
    error_code: error.code,
    error_details: error.details,
    error_hint: error.hint,
  });
});