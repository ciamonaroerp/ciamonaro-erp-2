import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data, payload_too_large } = await req.json();

    // Se payload foi muito grande, buscar dados completos
    let usuario = data;
    if (payload_too_large) {
      usuario = await base44.asServiceRole.entities.ErpUsuarios.get(event.entity_id);
    }

    // Buscar integrações ativas
    const integracoes = await base44.asServiceRole.entities.IntegracoesERP.filter({
      nome_app: 'FabricaFit',
      status: 'Ativo'
    });

    if (!integracoes || integracoes.length === 0) {
      console.log('[Integrações] Nenhuma integração FabricaFit ativa encontrada');
      return Response.json({ success: true });
    }

    const integracao = integracoes[0];

    // Preparar payload do evento
    const payload = {
      secret: integracao.secret_token,
      event: event.type,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        status: usuario.status,
        modulo_origem: 'ERP'
      }
    };

    // Enviar webhook
    const response = await fetch(integracao.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`[Integrações] Falha ao enviar ${event.type} para FabricaFit: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[Integrações] Resposta: ${errorBody}`);
      return Response.json({ success: true, warning: 'Webhook falhou mas ERP continua' });
    }

    console.log(`[Integrações] ${event.type.toUpperCase()} - ${usuario.email} enviado para FabricaFit`);

    // Atualizar timestamp de sincronização
    await base44.asServiceRole.entities.IntegracoesERP.update(integracao.id, {
      ultima_sincronizacao: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(`[Integrações] Erro: ${error.message}`);
    // Sempre retornar sucesso para não interromper operação do ERP
    return Response.json({ success: true, error: error.message });
  }
});