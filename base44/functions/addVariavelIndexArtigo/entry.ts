import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );

  // Check if column exists
  const { error: checkError } = await supabase
    .from('produto_comercial_artigo')
    .select('variavel_index')
    .limit(1);

  if (!checkError) {
    return Response.json({ success: true, message: 'Coluna variavel_index ja existe.' });
  }

  return Response.json({
    error: 'Coluna variavel_index nao existe. Execute no Supabase SQL Editor: ALTER TABLE produto_comercial_artigo ADD COLUMN IF NOT EXISTS variavel_index integer DEFAULT 1;',
    needsMigration: true
  }, { status: 500 });
});