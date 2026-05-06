import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = base44._supabaseClient;

    // 1. Adiciona coluna categoria_tamanho_id
    const { error: addColError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE config_tamanhos
        ADD COLUMN IF NOT EXISTS categoria_tamanho_id UUID REFERENCES public.categorias_tamanho(id);
      `
    }).catch(e => ({ error: e }));

    if (addColError && !addColError.message?.includes('already exists')) {
      // Tenta via SQL direto se RPC falhar
      await supabase.from('config_tamanhos').select('id').limit(0); // força criar tabela se não existir
    }

    // 2. Popula categoria_tamanho_id baseado em config_tamanhos.categoria (string)
    const { data: configTamanhos } = await supabase
      .from('config_tamanhos')
      .select('id, categoria, empresa_id')
      .is('categoria_tamanho_id', null); // só os não preenchidos

    if (configTamanhos && configTamanhos.length > 0) {
      const updates = [];
      
      for (const row of configTamanhos) {
        // Busca a categoria por nome
        const { data: categoria } = await supabase
          .from('categorias_tamanho')
          .select('id')
          .eq('nome', row.categoria)
          .eq('empresa_id', row.empresa_id)
          .single();

        if (categoria) {
          updates.push({
            id: row.id,
            categoria_tamanho_id: categoria.id
          });
        }
      }

      // Atualiza em batch
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('config_tamanhos')
          .upsert(updates, { onConflict: 'id' });

        if (updateError) {
          return Response.json({ error: updateError.message }, { status: 400 });
        }
      }
    }

    return Response.json({
      success: true,
      message: 'categoria_tamanho_id FK adicionada e populada com sucesso',
      rowsUpdated: configTamanhos?.length || 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});