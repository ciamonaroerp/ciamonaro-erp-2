/**
 * Inicializa a tabela empresas_config no Supabase.
 * Executar uma vez para criar a tabela.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Testa se tabela já existe inserindo e removendo
    const { error: testError } = await supabase.from('empresas_config').select('id').limit(1);

    if (!testError) {
      return Response.json({ message: 'Tabela empresas_config já existe', status: 'ok' });
    }

    return Response.json({
      message: 'Tabela não encontrada. Execute o SQL abaixo no Supabase SQL Editor:',
      sql: `
CREATE TABLE IF NOT EXISTS public.empresas_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID,
  cnpj TEXT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  situacao_cadastral TEXT,
  data_abertura DATE,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  email TEXT,
  telefone TEXT,
  status TEXT DEFAULT 'Ativo',
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

ALTER TABLE public.empresas_config DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE public.empresas_config TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
      `.trim(),
      error: testError.message,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});