import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lê variáveis de ambiente do servidor
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    const empresaId = Deno.env.get('VITE_EMPRESA_ID');

    return Response.json({
      VITE_SUPABASE_URL: {
        configured: !!supabaseUrl,
        value: supabaseUrl || null
      },
      VITE_SUPABASE_ANON_KEY: {
        configured: !!supabaseAnonKey,
        value: supabaseAnonKey ? '••••••••••••••••' : null
      },
      VITE_EMPRESA_ID: {
        configured: !!empresaId,
        value: empresaId || null
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});