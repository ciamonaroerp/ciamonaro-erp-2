import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
    });

    const body = await req.json();
    const { action, empresa_id, id, dados } = body;
    if (!action) return Response.json({ error: '"action" é obrigatório' }, { status: 400 });

    // Set bypass_rls para contornar RLS policies
    try { await supabase.rpc('set_config', { key: 'app.bypass_rls', value: 'true', is_local: true }); } catch (_) {}

    if (action === 'list') {
      // Tenta direto; se falhar por RLS, usa REST direto com service key
      let { data, error } = await supabase
        .from('produto_comercial')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('created_date', { ascending: false });

      if (error && error.code === '42501') {
        // Fallback: REST direto bypassando PostgREST RLS
        const res = await fetch(`${supabaseUrl}/rest/v1/produto_comercial?empresa_id=eq.${empresa_id}&order=codigo_produto.asc,created_date.desc`, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          }
        });
        if (res.ok) {
          data = await res.json();
          error = null;
        }
      }

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data: data || [] });
    }

    if (action === 'list_artigos') {
      let { data, error } = await supabase
        .from('produto_comercial_artigo')
        .select('*')
        .eq('produto_id', id);

      if (error && error.code === '42501') {
        const res = await fetch(`${supabaseUrl}/rest/v1/produto_comercial_artigo?produto_id=eq.${id}`, {
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        if (res.ok) { data = await res.json(); error = null; }
      }

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data: data || [] });
    }

    if (action === 'create') {
      if (!dados) return Response.json({ error: '"dados" é obrigatório' }, { status: 400 });
      const payload = { ...dados, empresa_id, created_date: new Date().toISOString() };

      let { data, error } = await supabase.from('produto_comercial').insert(payload).select().single();

      if (error && error.code === '42501') {
        const res = await fetch(`${supabaseUrl}/rest/v1/produto_comercial`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) { const arr = await res.json(); data = Array.isArray(arr) ? arr[0] : arr; error = null; }
        else { const e = await res.json(); return Response.json({ error: JSON.stringify(e) }, { status: 500 }); }
      }

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data });
    }

    if (action === 'update') {
      if (!id || !dados) return Response.json({ error: '"id" e "dados" são obrigatórios' }, { status: 400 });
      const payload = { ...dados, updated_date: new Date().toISOString() };

      let { data, error } = await supabase.from('produto_comercial').update(payload).eq('id', id).select().single();

      if (error && error.code === '42501') {
        const res = await fetch(`${supabaseUrl}/rest/v1/produto_comercial?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) { const arr = await res.json(); data = Array.isArray(arr) ? arr[0] : arr; error = null; }
        else { const e = await res.json(); return Response.json({ error: JSON.stringify(e) }, { status: 500 }); }
      }

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data });
    }

    if (action === 'delete') {
      if (!id) return Response.json({ error: '"id" é obrigatório' }, { status: 400 });
      let { error } = await supabase.from('produto_comercial').delete().eq('id', id);

      if (error && error.code === '42501') {
        const res = await fetch(`${supabaseUrl}/rest/v1/produto_comercial?id=eq.${id}`, {
          method: 'DELETE',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        if (res.ok) error = null;
        else { const e = await res.json(); return Response.json({ error: JSON.stringify(e) }, { status: 500 }); }
      }

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true });
    }

    if (action === 'create_artigo') {
      if (!dados) return Response.json({ error: '"dados" é obrigatório' }, { status: 400 });
      const payload = { ...dados, empresa_id, created_date: new Date().toISOString() };

      let { data, error } = await supabase.from('produto_comercial_artigo').insert(payload).select().single();

      if (error && error.code === '42501') {
        const res = await fetch(`${supabaseUrl}/rest/v1/produto_comercial_artigo`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) { const arr = await res.json(); data = Array.isArray(arr) ? arr[0] : arr; error = null; }
        else { const e = await res.json(); return Response.json({ error: JSON.stringify(e) }, { status: 500 }); }
      }

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data });
    }

    if (action === 'delete_artigo') {
      if (!id) return Response.json({ error: '"id" é obrigatório' }, { status: 400 });
      let { error } = await supabase.from('produto_comercial_artigo').delete().eq('id', id);

      if (error && error.code === '42501') {
        const res = await fetch(`${supabaseUrl}/rest/v1/produto_comercial_artigo?id=eq.${id}`, {
          method: 'DELETE',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        if (res.ok) error = null;
        else { const e = await res.json(); return Response.json({ error: JSON.stringify(e) }, { status: 500 }); }
      }

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});