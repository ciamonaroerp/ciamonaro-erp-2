import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { solicitacao_id, tipo, usuario_email } = await req.json();

    const tipoLabel = tipo === 'PPCP' ? 'Solicitação PPCP' : 'Cotação de Frete';
    const titulo = `Nova mensagem em ${tipoLabel}: ${solicitacao_id}`;

    console.log(`[Notificação de mensagem] ${titulo}`);

    return Response.json({ 
      success: true, 
      message: 'Notificação de mensagem enviada' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});