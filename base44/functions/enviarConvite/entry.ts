import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, nome } = await req.json();

    if (!email) {
      return Response.json({ success: false, error: 'email é obrigatório' }, { status: 400 });
    }

    // Convida o usuário para o app via Base44 (envia email de convite)
    try {
      await base44.users.inviteUser(email, 'user');
    } catch (inviteError) {
      // Se o usuário já existe, continua mesmo assim (permite reenviar convite)
      if (!inviteError.message?.includes('already exists')) {
        throw inviteError;
      }
      console.log(`[enviarConvite] Usuário ${email} já existe, permitindo reenvio`);
    }

    console.log(`[enviarConvite] Convite enviado para ${email}`);
    return Response.json({ success: true, email });
  } catch (error) {
    console.error(`[enviarConvite] Erro: ${error.message}`);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});