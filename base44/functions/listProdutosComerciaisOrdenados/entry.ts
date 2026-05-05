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

    // Ordena por codigo_produto, NULLs no final
    const sorted = data.sort((a, b) => {
      if (!a.codigo_produto && !b.codigo_produto) return 0;
      if (!a.codigo_produto) return 1;
      if (!b.codigo_produto) return -1;
      return a.codigo_produto.localeCompare(b.codigo_produto, 'pt-BR', { numeric: true });
    });

    return Response.json({ data: sorted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});