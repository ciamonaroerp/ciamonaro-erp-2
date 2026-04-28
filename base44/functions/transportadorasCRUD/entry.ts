import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !serviceKey) return Response.json({ error: "Config missing" }, { status: 500 });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { action, id, data } = await req.json();

    if (action === 'list') {
      const { data: rows, error } = await supabase
        .from('transportadoras')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return Response.json({ error: error.message, details: error.details }, { status: 400 });
      return Response.json({ data: rows });
    }

    if (action === 'create') {
      // Sanitiza: remove campos nulos/vazios e campos de sistema
      const payload = Object.fromEntries(
        Object.entries(data).filter(([k, v]) => !['id','created_at','updated_at','created_date'].includes(k) && v !== null && v !== '' && v !== undefined)
      );
      // Converte data_abertura de DD/MM/YYYY para YYYY-MM-DD se necessário
      if (payload.data_abertura && typeof payload.data_abertura === 'string' && payload.data_abertura.includes('/')) {
        const parts = payload.data_abertura.split('/');
        if (parts.length === 3) payload.data_abertura = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      }
      const { data: row, error } = await supabase
        .from('transportadoras')
        .insert(payload)
        .select()
        .single();
      if (error) return Response.json({ error: error.message, details: error.details, hint: error.hint }, { status: 400 });
      return Response.json({ data: row });
    }

    if (action === 'update') {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([k, v]) => !['id','created_at','updated_at','created_date'].includes(k) && v !== undefined)
        .map(([k, v]) => [k, v === '' ? null : v])
      );
      // Converte data_abertura de DD/MM/YYYY para YYYY-MM-DD se necessário
      if (payload.data_abertura && typeof payload.data_abertura === 'string' && payload.data_abertura.includes('/')) {
        const parts = payload.data_abertura.split('/');
        if (parts.length === 3) payload.data_abertura = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      }
      const { data: row, error } = await supabase
        .from('transportadoras')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) return Response.json({ error: error.message, details: error.details }, { status: 400 });
      return Response.json({ data: row });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('transportadoras').delete().eq('id', id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});