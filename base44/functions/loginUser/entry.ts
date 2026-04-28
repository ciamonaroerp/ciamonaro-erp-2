import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Gerar token de sessão seguro
function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return Response.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Buscar usuário por email
    const usuarios = await base44.asServiceRole.entities.ErpUsuarios.filter({
      email: email
    });

    if (!usuarios || usuarios.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    const usuario = usuarios[0];

    // Verificar se usuário está ativo
    if (usuario.status !== 'Ativo') {
      return Response.json({ error: 'Usuário inativo' }, { status: 401 });
    }

    // TODO: Validar senha (implementar hash/comparação quando integrado com auth real)
    // Por enquanto, aceitar qualquer senha para desenvolvimento
    if (!senha || senha.length < 8) {
      return Response.json({ error: 'Senha inválida' }, { status: 401 });
    }

    // Gerar token de sessão
    const sessionToken = generateSessionToken();
    const dataExpiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Preparar dados da sessão
    const sessionData = {
      user_id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      modulos_autorizados: usuario.modulos_autorizados || [],
      data_expiracao: dataExpiracao.toISOString(),
      criado_em: new Date().toISOString()
    };

    // Armazenar token no cookie (será feito pelo frontend)
    console.log(`[Auth] Usuário ${email} autenticado com sucesso`);

    return Response.json({
      success: true,
      session_token: sessionToken,
      user: sessionData
    }, {
      headers: {
        'Set-Cookie': `erp_session_token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
      }
    });
  } catch (error) {
    console.error(`[Auth] Erro ao fazer login: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});