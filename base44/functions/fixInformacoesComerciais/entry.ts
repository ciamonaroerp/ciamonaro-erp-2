import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Disable RLS on informacoes_condicoes_comerciais
    const { error: rls_error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE informacoes_condicoes_comerciais DISABLE ROW LEVEL SECURITY;`
    });

    if (rls_error) {
      console.log('RLS disable (expected to fail via RPC):', rls_error.message);
    }

    // Create simple permissive policy
    const { error: policy_error } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "allow_all" ON informacoes_condicoes_comerciais;
        CREATE POLICY "allow_all" ON informacoes_condicoes_comerciais
        FOR ALL USING (true) WITH CHECK (true);
      `
    });

    if (policy_error) {
      console.log('Policy creation (expected to fail via RPC):', policy_error.message);
    }

    return Response.json({ 
      message: 'Attempted to fix RLS policies. Check Supabase dashboard for actual status.',
      note: 'Use Supabase dashboard > Authentication > Policies to manually disable RLS or create permissive policies.'
    });
  } catch (err) {
    console.error('Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});