import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { empresa_id, tipo, descricao, dados, nivel = "medio", modulo_origem } = body;

    // Validação básica
    if (!empresa_id) {
      return Response.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
    }
    if (!tipo) {
      return Response.json({ error: 'tipo é obrigatório' }, { status: 400 });
    }
    if (!descricao) {
      return Response.json({ error: 'descricao é obrigatório' }, { status: 400 });
    }

    // Registra alerta no banco
    const response = await base44.asServiceRole.functions.invoke('supabaseCRUD', {
      action: 'create',
      table: 'sistema_alertas',
      data: {
        empresa_id,
        tipo,
        descricao,
        dados: dados || {},
        nivel,
        modulo_origem,
        status: 'aberto',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    const error = response?.data?.error || response?.error;
    if (error) {
      throw new Error(`Falha ao registrar alerta: ${String(error)}`);
    }

    return Response.json({
      success: true,
      data: response?.data?.data || response?.data,
      error: null,
    });
  } catch (error) {
    console.error('[registrarAlerta] Erro:', error.message);
    return Response.json({
      success: false,
      data: null,
      error: error.message,
    }, { status: 500 });
  }
});