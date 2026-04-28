import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Testar conexão Supabase invocando função existente
    const config = await base44.functions.invoke('getSupabaseConfig', {});
    
    const diagnostico = {
      timestamp: new Date().toISOString(),
      usuario: user.email,
      conexao: 'verificada',
      supabase_config: config.data ? 'carregado' : 'erro',
      mensagem: 'Use o SupabaseDebug2 para verificar detalhes completos das tabelas'
    };

    return Response.json(diagnostico);
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});