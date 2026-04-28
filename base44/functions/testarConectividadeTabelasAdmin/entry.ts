import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    // Cliente com service role (permissões admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lista de tabelas para testar (baseado no DATABASE_SCHEMA)
    const tabelas = [
      'empresas', 'usuarios', 'clientes', 'pedidos', 'pedidos_itens',
      'contas_receber', 'contas_pagar', 'fornecedores', 'pedidos_compra',
      'materias_primas', 'estoque_materia_mov', 'produtos', 'estoque_produtos',
      'ordens_producao', 'producao_etapas', 'expedicoes', 'controle_qualidade',
      'embalagens', 'configuracoes_erp', 'integracoes_erp', 'logs_auditoria',
      'perfis_acesso', 'modulos_erp', 'erp_usuarios'
    ];

    const resultados = {};

    for (const tabela of tabelas) {
      try {
        const { error } = await supabase.from(tabela).select('id').limit(1);
        if (error) {
          resultados[tabela] = { ok: false, msg: error.message };
        } else {
          resultados[tabela] = { ok: true };
        }
      } catch (e) {
        resultados[tabela] = { ok: false, msg: e.message };
      }
    }

    return Response.json(resultados);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});