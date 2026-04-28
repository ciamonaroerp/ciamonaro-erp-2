import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, empresa_id } = body;

    if (action === 'list') {
      try {
        let query = supabaseAdmin
          .from('sistema_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        // Filtra por empresa_id apenas se informado
        if (empresa_id) {
          query = query.or(`empresa_id.eq.${empresa_id},empresa_id.is.null`);
        }

        const { data, error } = await query;
        if (error) {
          // Se tabela não existe, retorna vazio
          if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
            return Response.json({ data: [] });
          }
          throw error;
        }
        return Response.json({ data: data || [] });
      } catch (e) {
        console.error('[sistemaLogsCRUD] Erro ao listar:', e.message);
        // Se erro é de tabela, retorna vazio
        if (e.message?.includes('Could not find the table') || e.message?.includes('PGRST205')) {
          return Response.json({ data: [] });
        }
        throw e;
      }
    }

    return Response.json({ error: 'action inválida' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});