/**
 * initFornecedorTipos — Cria tabela fornecedor_tipos e insere dados padrão
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get("VITE_SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Cria tabela via SQL direto
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        create table if not exists fornecedor_tipos (
          id uuid primary key default gen_random_uuid(),
          nome text not null unique,
          created_at timestamp default now()
        );
        alter table fornecedores add column if not exists tipo_id uuid references fornecedor_tipos(id);
        create index if not exists idx_fornecedor_tipo on fornecedores(tipo_id);
      `
    });

    // Se rpc não existir, tenta via insert direto (a tabela pode já existir)
    // Insere tipos padrão
    const tiposPadrao = ['Tecidos', 'Aviamentos', 'Insumos de estamparia', 'Serviço de produção', 'Logística / transporte', 'Administrativo / operacional'];
    const results = [];
    for (const nome of tiposPadrao) {
      const { data, error } = await supabase
        .from('fornecedor_tipos')
        .upsert({ nome }, { onConflict: 'nome', ignoreDuplicates: true })
        .select();
      results.push({ nome, ok: !error, error: error?.message });
    }

    // Adiciona coluna tipo_id na tabela fornecedores se não existir
    let colError = null;
    try {
      const r = await supabase.rpc('exec_sql', { sql: `alter table fornecedores add column if not exists tipo_id uuid;` });
      colError = r.error;
    } catch (_) {}

    return Response.json({ 
      success: true, 
      sqlError: sqlError?.message || null,
      colError: colError?.message || null,
      tipos: results 
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});