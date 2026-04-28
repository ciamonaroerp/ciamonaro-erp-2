import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { table, payload } = await req.json();

  if (!table || !payload || typeof payload !== 'object') {
    return Response.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Tenta inserir
  const { data, error } = await supabase.from(table).insert([payload]).select('id').single();

  if (error) {
    return Response.json({
      success: false,
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  // Sucesso: remove a linha de teste imediatamente
  if (data?.id) {
    await supabase.from(table).delete().eq('id', data.id);
  }

  return Response.json({ success: true, message: 'Payload válido! INSERT aceito e revertido com sucesso.' });
});