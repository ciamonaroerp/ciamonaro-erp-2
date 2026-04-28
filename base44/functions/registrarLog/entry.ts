/**
 * registrarLog — Função utilitária de auditoria do CIAMONARO ERP
 * 
 * DIRETRIZES ARQUITETURAIS:
 * - Compatível com migração para Node.js/Hostinger
 * - Usa variáveis de ambiente para configuração
 * - Estrutura de dados compatível com PostgreSQL/MySQL
 * - Endpoint padronizado: /api/logs
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evento, modulo, descricao, dados_extras, status, ip_origem, usuario_email } = body;

    if (!evento || !modulo) {
      return Response.json({ error: 'Campos obrigatórios: evento, modulo' }, { status: 400 });
    }

    const log = await base44.asServiceRole.entities.LogsAuditoria.create({
      evento,
      modulo,
      descricao: descricao || '',
      dados_extras: dados_extras ? JSON.stringify(dados_extras) : '',
      status: status || 'Sucesso',
      ip_origem: ip_origem || req.headers.get('x-forwarded-for') || '',
      usuario_email: usuario_email || user.email
    });

    return Response.json({ success: true, log_id: log.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});