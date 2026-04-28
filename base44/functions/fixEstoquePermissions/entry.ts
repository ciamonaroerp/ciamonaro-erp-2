import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sqls = [
    // Garantir permissões para anon e authenticated
    `GRANT ALL ON TABLE public.estoque_locais TO anon, authenticated, service_role`,
    `GRANT ALL ON TABLE public.estoque_movimentacoes TO anon, authenticated, service_role`,

    // Desabilitar RLS (mais simples para uso interno com service_role)
    `ALTER TABLE public.estoque_locais DISABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.estoque_movimentacoes DISABLE ROW LEVEL SECURITY`,
  ];

  const results = [];
  for (const sql of sqls) {
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: { message: 'rpc não disponível' } }));
    if (error) {
      // Fallback: tentar via query direta
      results.push({ sql: sql.substring(0, 50), status: 'tentado via rpc', error: error.message });
    } else {
      results.push({ sql: sql.substring(0, 50), status: 'ok' });
    }
  }

  // Alternativa: rodar o SQL completo como string via postgrest
  const fixSql = `
    GRANT ALL ON TABLE public.estoque_locais TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.estoque_movimentacoes TO anon, authenticated, service_role;
    ALTER TABLE public.estoque_locais DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.estoque_movimentacoes DISABLE ROW LEVEL SECURITY;
  `;

  return Response.json({
    mensagem: 'Execute o SQL abaixo diretamente no Supabase SQL Editor para corrigir as permissões',
    sql_para_executar: fixSql.trim(),
    tentativas_rpc: results,
  });
});