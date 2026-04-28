import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.produto_rendimento_valores ADD COLUMN IF NOT EXISTS sincronizado boolean DEFAULT false;`
    });

    if (error) {
      // Tenta direto via query
      const { error: e2 } = await supabase
        .from('produto_rendimento_valores')
        .update({ sincronizado: false })
        .eq('id', '00000000-0000-0000-0000-000000000000');

      if (e2 && e2.message.includes('sincronizado')) {
        return Response.json({
          error: 'Coluna não existe. Execute manualmente no Supabase SQL Editor:',
          sql: 'ALTER TABLE public.produto_rendimento_valores ADD COLUMN IF NOT EXISTS sincronizado boolean DEFAULT false;'
        }, { status: 400 });
      }
    }

    return Response.json({ success: true, message: 'Coluna sincronizado adicionada com sucesso.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});