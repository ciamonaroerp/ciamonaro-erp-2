import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Testar insert com todas as colunas extras
    const testRecord = {
      nome_cliente: '__MIGRATION_TEST__',
      documento: '__TEST_' + Date.now(),
      tipo_pessoa: 'PJ',
      nome_fantasia: 'test',
      endereco: 'test',
      numero: '1',
      bairro: 'test',
      cep: '00000-000',
      cidade: 'test',
      estado: 'SP',
      telefone: '',
      email: '',
      status: 'Ativo',
      vendedor_id: null,
      vendedor_nome: '',
      inscricao_estadual: '',
      situacao_ie: 'Não Contribuinte',
      situacao_cadastral: '',
      data_abertura: '',
      atividade_principal: '',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('clientes')
      .insert(testRecord)
      .select()
      .single();

    if (inserted) {
      await supabase.from('clientes').delete().eq('id', inserted.id);
      return Response.json({ status: 'OK — todas as colunas existem!', columns: Object.keys(testRecord) });
    }

    return Response.json({
      status: 'ERRO — colunas faltando',
      error: insertError?.message,
      sql_to_run: `
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT DEFAULT 'PJ';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS vendedor_id TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS vendedor_nome TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS situacao_ie TEXT DEFAULT 'Não Contribuinte';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS situacao_cadastral TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_abertura TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS atividade_principal TEXT;
      `.trim()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});