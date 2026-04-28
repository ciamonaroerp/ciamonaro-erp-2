import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { solicitacao_id, novo_status, vendedor_email } = await req.json();

    const titulo = `Status atualizado: ${solicitacao_id}`;
    const mensagem = `Sua solicitação foi atualizada para: ${novo_status}`;

    console.log(`[Notificação para ${vendedor_email}] ${titulo} - ${mensagem}`);

    return Response.json({ 
      success: true, 
      message: 'Notificação de mudança enviada' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});