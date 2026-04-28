import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const email = 'monaro.adm@gmail.com';

    // Verifica se existe
    const { data: existing, error: selectErr } = await supabase
      .from('erp_usuarios')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (selectErr) return Response.json({ error: 'SELECT error: ' + selectErr.message }, { status: 500 });

    let result;
    if (existing) {
      // Atualiza para Administrador
      const { data, error } = await supabase
        .from('erp_usuarios')
        .update({ perfil: 'Administrador', status: 'Ativo' })
        .eq('email', email)
        .select()
        .single();
      if (error) return Response.json({ error: 'UPDATE error: ' + error.message }, { status: 500 });
      result = { action: 'updated', data };
    } else {
      // Insere novo registro
      const { data, error } = await supabase
        .from('erp_usuarios')
        .insert({ nome: 'Monaro Adm', email, perfil: 'Administrador', status: 'Ativo' })
        .select()
        .single();
      if (error) return Response.json({ error: 'INSERT error: ' + error.message }, { status: 500 });
      result = { action: 'inserted', data };
    }

    return Response.json({ success: true, ...result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});