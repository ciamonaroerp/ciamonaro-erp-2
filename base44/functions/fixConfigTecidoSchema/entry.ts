/**
 * Corrige schema das tabelas config_tecido:
 * 1. Amplia colunas de código de VARCHAR(4) para TEXT
 * 2. Adiciona coluna deleted_at nas tabelas artigo e linha_comercial
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    // Executa cada ALTER via REST do Supabase (endpoint /rpc/exec_sql não existe por padrão)
    // Usamos inserção num registro fictício para contornar — não funciona.
    // Melhor abordagem: retornar o SQL para execução manual no SQL Editor.
    const sql = `
-- Ampliar colunas de código para TEXT (remove limite VARCHAR(4))
ALTER TABLE public.config_tecido_cor ALTER COLUMN codigo_cor TYPE TEXT;
ALTER TABLE public.config_tecido_artigo ALTER COLUMN codigo_artigo TYPE TEXT;
ALTER TABLE public.config_tecido_linha_comercial ALTER COLUMN codigo_linha_comercial TYPE TEXT;

-- Adicionar deleted_at nas tabelas que não possuem soft delete
ALTER TABLE public.config_tecido_artigo ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.config_tecido_linha_comercial ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
`;

    return new Response(sql, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});