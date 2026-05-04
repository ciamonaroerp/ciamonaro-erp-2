import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * CRUD proxy para produto_rendimentos e produto_rendimento_valores.
 * Usa anon key mas contorna RLS porque as funções Deno têm acesso direto ao Supabase REST.
 * 
 * Actions:
 *   list_rendimentos       - lista rendimentos da empresa
 *   list_valores           - lista valores da empresa
 *   create_rendimento      - cria novo rendimento { empresa_id, nome }
 *   update_rendimento      - atualiza rendimento { id, nome }
 *   delete_rendimento      - soft delete rendimento { id }
 *   upsert_valor           - upsert de valor { empresa_id, rendimento_id, produto_id, descricao_artigo, vinculo_id, valor }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, ...params } = body;

    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');

    // Usa fetch direto com a anon key como apikey (bypass do RLS client-side)
    // As funções Deno têm permissões de service implícitas no contexto base44
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    const REST = `${SUPABASE_URL}/rest/v1`;

    if (action === 'list_rendimentos') {
      const { empresa_id } = params;
      if (!empresa_id) return Response.json({ error: 'empresa_id obrigatorio' }, { status: 400 });
      const r = await fetch(`${REST}/produto_rendimentos?empresa_id=eq.${empresa_id}&deleted_at=is.null&order=nome.asc`, { headers });
      const data = await r.json();
      return Response.json({ data: Array.isArray(data) ? data : [] });
    }

    if (action === 'list_valores') {
      const { empresa_id } = params;
      if (!empresa_id) return Response.json({ error: 'empresa_id obrigatorio' }, { status: 400 });
      const r = await fetch(`${REST}/produto_rendimento_valores?empresa_id=eq.${empresa_id}`, { headers });
      const data = await r.json();
      return Response.json({ data: Array.isArray(data) ? data : [] });
    }

    if (action === 'create_rendimento') {
      const { empresa_id, nome } = params;
      if (!empresa_id || !nome) return Response.json({ error: 'empresa_id e nome obrigatorios' }, { status: 400 });
      const r = await fetch(`${REST}/produto_rendimentos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ empresa_id, nome }),
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: Array.isArray(data) ? data[0]?.message : data?.message }, { status: r.status });
      return Response.json({ data: Array.isArray(data) ? data[0] : data });
    }

    if (action === 'update_rendimento') {
      const { id, nome } = params;
      if (!id || !nome) return Response.json({ error: 'id e nome obrigatorios' }, { status: 400 });
      const r = await fetch(`${REST}/produto_rendimentos?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ nome, updated_at: new Date().toISOString() }),
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: Array.isArray(data) ? data[0]?.message : data?.message }, { status: r.status });
      return Response.json({ success: true });
    }

    if (action === 'delete_rendimento') {
      const { id } = params;
      if (!id) return Response.json({ error: 'id obrigatorio' }, { status: 400 });
      const r = await fetch(`${REST}/produto_rendimentos?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      });
      if (!r.ok) {
        const data = await r.json();
        return Response.json({ error: Array.isArray(data) ? data[0]?.message : data?.message }, { status: r.status });
      }
      return Response.json({ success: true });
    }

    if (action === 'upsert_valor') {
      const { empresa_id, rendimento_id, produto_id, descricao_artigo, vinculo_id, valor } = params;
      if (!empresa_id || !rendimento_id || !produto_id) return Response.json({ error: 'campos obrigatorios ausentes' }, { status: 400 });
      const upsertHeaders = { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates', 'on-conflict': 'rendimento_id,produto_id,descricao_artigo' };
      const r = await fetch(`${REST}/produto_rendimento_valores`, {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify({
          empresa_id,
          rendimento_id,
          produto_id,
          descricao_artigo: descricao_artigo || '',
          vinculo_id: vinculo_id || null,
          valor,
          sincronizado: true,
          updated_at: new Date().toISOString(),
        }),
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: Array.isArray(data) ? data[0]?.message : data?.message }, { status: r.status });
      return Response.json({ success: true });
    }

    return Response.json({ error: `Acao desconhecida: ${action}` }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});