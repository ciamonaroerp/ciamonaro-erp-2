import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
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
    const { empresa_id, atualizacoes } = body;

    if (!Array.isArray(atualizacoes)) {
      return Response.json({ error: 'atualizacoes deve ser um array de {codigo_unico, descricao_complementar}' }, { status: 400 });
    }

    let count = 0;
    for (const upd of atualizacoes) {
      const { codigo_unico, descricao_complementar } = upd;
      if (!codigo_unico || !descricao_complementar) continue;

      const { error } = await supabaseAdmin
        .from('config_vinculos')
        .update({ descricao_complementar })
        .eq('empresa_id', empresa_id)
        .eq('codigo_unico', codigo_unico);

      if (!error) count++;
      else console.error(`[Erro] ${codigo_unico}:`, error.message);
    }

    return Response.json({ atualizados: count, total_tentativas: atualizacoes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});