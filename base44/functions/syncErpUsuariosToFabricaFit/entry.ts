import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { event, data } = payload;

    // Configurar URL do FabricaFit (usar variável de ambiente ou valor padrão)
    const fabricafitUrl = Deno.env.get('FABRICAFIT_SYNC_URL') || 'https://seu-fabricafit-app.base44.app/functions/receiveErpUsers';
    const syncSecret = Deno.env.get('FABRICAFIT_SYNC_SECRET') || 'seu-secret-compartilhado';

    let usuarioData = data;

    // Se payload for muito grande, buscar os dados via SDK
    if (payload.payload_too_large) {
      usuarioData = await base44.entities.ErpUsuarios.get(data.id);
    }

    // Montar o payload para enviar
    const syncPayload = {
      event: event.type, // 'create', 'update', 'delete'
      usuario: {
        id: usuarioData.id,
        nome: usuarioData.nome,
        email: usuarioData.email,
        perfil: usuarioData.perfil,
        status: usuarioData.status,
        modulos_autorizados: usuarioData.modulos_autorizados || [],
        modulo_origem: usuarioData.modulo_origem
      },
      timestamp: new Date().toISOString(),
      secret: syncSecret
    };

    // Enviar para o FabricaFit
    const response = await fetch(fabricafitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${syncSecret}`
      },
      body: JSON.stringify(syncPayload)
    });

    if (!response.ok) {
      console.error(`FabricaFit sync failed: ${response.statusText}`);
      return Response.json({
        success: false,
        message: `Sync to FabricaFit failed: ${response.statusText}`
      }, { status: response.status });
    }

    const result = await response.json();
    return Response.json({
      success: true,
      message: `Usuario ${usuarioData.email} sincronizado com sucesso`,
      fabricafitResponse: result
    });

  } catch (error) {
    console.error('Sync error:', error.message);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});