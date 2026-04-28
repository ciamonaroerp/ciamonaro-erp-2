import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Testa com postgrest (raw SQL via Supabase Admin API)
    // Primeiro, tenta chamar uma função SQL que não é direto suporte do client
    // Alternativa: usar o Admin API direto via fetch

    const adminUrl = `${supabaseUrl}/rest/v1/`;
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    // Testa se consegue fazer SELECT via service role
    const testRes = await fetch(`${adminUrl}produto_comercial?select=id&limit=1`, {
      headers
    });

    if (!testRes.ok) {
      const err = await testRes.json();
      console.log('Erro ao acessar:', err);
    }

    // A única solução é via Supabase Dashboard ou usar credentials corretas
    // Vou retornar instruções
    return Response.json({ 
      error: 'Tabela produto_comercial tem RLS policies restritivas',
      solution: 'Você deve ir em Supabase Dashboard > Authentication > Policies e remover ou atualizar as policies que bloqueiam o service role',
      hint: 'Ou desabilitar RLS completamente na tabela produto_comercial via Dashboard'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});