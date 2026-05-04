import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: erpUser } = await supabase
      .from('erp_usuarios')
      .select('empresa_id')
      .eq('email', user.email)
      .single();

    const empresa_id = erpUser?.empresa_id;

    // Testa SELECT com anon key
    const { data: rendAnon, error: errAnon } = await supabase
      .from('produto_rendimentos')
      .select('*');

    // Testa INSERT direto para ver se consegue criar
    const testNome = `__DIAG_TEST_${Date.now()}`;
    const { data: inserted, error: insertErr } = await supabase
      .from('produto_rendimentos')
      .insert({ empresa_id, nome: testNome })
      .select()
      .single();

    // Se conseguiu inserir, deleta
    if (inserted?.id) {
      await supabase.from('produto_rendimentos').delete().eq('id', inserted.id);
    }

    // Lê de novo para confirmar
    const { data: rendApos, error: errApos } = await supabase
      .from('produto_rendimentos')
      .select('*')
      .eq('empresa_id', empresa_id);

    return Response.json({
      empresa_id,
      anon_select: { count: (rendAnon || []).length, error: errAnon?.message, dados: rendAnon },
      insert_test: { success: !!inserted, error: insertErr?.message },
      select_apos_delete: { count: (rendApos || []).length, error: errApos?.message },
    });
  } catch (e) {
    return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
});