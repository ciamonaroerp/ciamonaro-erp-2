import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, payload_too_large } = await req.json();

    // Buscar dados completos se payload grande demais
    let usuario = data;
    if (payload_too_large) {
      usuario = await base44.asServiceRole.entities.ErpUsuarios.get(event.entity_id);
    }

    // Só enviar convite para usuários com status Pendente (recém criados)
    if (usuario.status !== 'Pendente') {
      console.log(`[Convites] Ignorando usuário ${usuario.email} com status ${usuario.status}`);
      return Response.json({ success: true, skipped: true });
    }

    const token = generateToken();
    const agora = new Date();
    const dataExpiracao = new Date(agora.getTime() + 48 * 60 * 60 * 1000); // +48h

    // Criar registro do convite
    const convite = await base44.asServiceRole.entities.ConvitesUsuarios.create({
      usuario_id: usuario.id,
      email: usuario.email,
      token: token,
      data_criacao: agora.toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      status: 'Pendente'
    });

    // Link de ativação — usa APP_BASE_URL (ex: https://erp.ciamonaro.com.br em produção)
    const appUrl = Deno.env.get('APP_BASE_URL') || Deno.env.get('APP_URL') || 'https://handsome-fit-flow-admin.base44.app';
    const linkAtivacao = `${appUrl}/ativar-conta?token=${token}`;

    // Enviar email — compatível com SMTP/SendGrid/Mailgun/Resend/Hostinger SMTP via provider externo
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: usuario.email,
      subject: 'Convite para acessar o CIAMONARO ERP',
      body: `Olá ${usuario.nome},

Você foi convidado para acessar o CIAMONARO ERP.

Clique no link abaixo para criar sua senha e ativar sua conta:

${linkAtivacao}

Este link expira em 48 horas.

Caso não reconheça este convite, ignore este email.

---
CIAMONARO ERP • Sistema de Administração`
    });

    // Registrar audit log centralizado
    await base44.asServiceRole.entities.AuditLogs.create({
      acao: 'enviar_convite',
      entidade: 'ErpUsuarios',
      registro_id: usuario.id,
      usuario_email: usuario.email,
      modulo: 'Administração',
      dados_novos: JSON.stringify({ convite_id: convite.id, expira_em: dataExpiracao.toISOString() }),
      data_evento: new Date().toISOString()
    });

    console.log(`[Convites] Convite enviado para ${usuario.email} - Token: ${token.substring(0, 8)}...`);

    return Response.json({ success: true, convite_id: convite.id, email: usuario.email });
  } catch (error) {
    console.error(`[Convites] Erro: ${error.message}`);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});