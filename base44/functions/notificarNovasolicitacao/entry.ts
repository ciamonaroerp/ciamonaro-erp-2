import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo, numero_solicitacao } = await req.json();

    const titulo = tipo === 'PPCP' 
      ? `Nova Solicitação PPCP: ${numero_solicitacao}`
      : `Nova Cotação de Frete: ${numero_solicitacao}`;

    const mensagem = tipo === 'PPCP'
      ? `Uma nova solicitação de disponibilidade de produção foi criada.`
      : `Uma nova cotação de frete foi criada.`;

    // Aqui você poderia enviar notificações via email ou outras integrações
    console.log(`[Notificação] ${titulo}`);

    return Response.json({ 
      success: true, 
      message: 'Notificação enviada' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});