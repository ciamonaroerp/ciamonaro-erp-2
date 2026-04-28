import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { empresa_id } = await req.json();

    if (!empresa_id) {
      return Response.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
    }

    // Usa a função existente que já respeita RLS
    const res = await base44.functions.invoke('produtoComercialCRUD', {
      action: 'list_produtos',
      empresa_id,
    });

    const data = res?.data?.data || [];

    // Ordena por codigo, NULLs no final
    const sorted = data.sort((a, b) => {
      if (!a.codigo && !b.codigo) return 0;
      if (!a.codigo) return 1;
      if (!b.codigo) return -1;
      return a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true });
    });

    return Response.json({ data: sorted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});