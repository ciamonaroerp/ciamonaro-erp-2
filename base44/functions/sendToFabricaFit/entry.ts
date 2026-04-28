import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data, payload_too_large } = await req.json();
    
    // Se payload foi muito grande, buscar dados completos
    let usuario = data;
    if (payload_too_large) {
      usuario = await base44.asServiceRole.entities.ErpUsuarios.get(data.id);
    }

    // Buscar configuração da integração FabricaFit
    const integracoes = await base44.asServiceRole.entities.IntegracoesERP.filter({ nome_app: 'FabricaFit' });
    
    if (!integracoes || integracoes.length === 0) {
      console.error('[FabricaFit Sync] Integração não encontrada na base');
      return Response.json({ error: 'Integração não configurada' }, { status: 404 });
    }

    const integracao = integracoes[0];
    
    // Verificar se integração está ativa
    if (integracao.status !== 'Ativo') {
      console.warn('[FabricaFit Sync] Integração desativada');
      return Response.json({ success: true, message: 'Integração desativada' });
    }

    const syncSecret = integracao.secret_token;
    const fabricafitUrl = integracao.webhook_url;

    const payload = {
      secret: syncSecret,
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

    // Enviar para FabricaFit
    const response = await fetch(fabricafitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`FabricaFit sync failed: ${response.status} - ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`Response: ${errorBody}`);
      // Registrar erro mas não falhar (não interromper operação do ERP)
    } else {
      console.log(`[FabricaFit Sync] ${event.type.toUpperCase()} - ${usuario.email} sincronizado com sucesso`);
      
      // Atualizar timestamp da última sincronização
      await base44.asServiceRole.entities.IntegracoesERP.update(integracao.id, {
        ultima_sincronizacao: new Date().toISOString()
      });
    }

    return Response.json({ 
      success: true, 
      message: `Sincronização iniciada para ${usuario.email} (${event.type})` 
    });
  } catch (error) {
    console.error('[FabricaFit Sync Error]', error.message);
    // Sempre retornar sucesso para não interromper o ERP
    return Response.json({ 
      success: true, 
      message: 'Sync queued (async)', 
      error: error.message 
    });
  }
});