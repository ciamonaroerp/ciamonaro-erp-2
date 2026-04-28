/**
 * jobsWorker — Worker de processamento de filas do CIAMONARO ERP
 * 
 * Executa periodicamente via automation (scheduled) para processar jobs pendentes.
 * Compatível com Node.js/PostgreSQL para migração futura.
 * 
 * Jobs suportados:
 * - enviar_email
 * - sincronizar_app
 * - enviar_notificacao
 * - gerar_relatorio
 * - processar_producao
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar jobs pendentes (máx 10 por ciclo)
    const jobs = await base44.asServiceRole.entities.JobsQueue.filter(
      { status: 'Pendente' },
      'created_date',
      10
    );

    if (jobs.length === 0) {
      return Response.json({ success: true, processados: 0, mensagem: 'Nenhum job pendente' });
    }

    const resultados = [];

    for (const job of jobs) {
      const agora = new Date().toISOString();

      // Marcar como Processando
      await base44.asServiceRole.entities.JobsQueue.update(job.id, {
        status: 'Processando',
        data_execucao: agora,
        tentativas: (job.tentativas || 0) + 1
      });

      let payload = {};
      try {
        payload = JSON.parse(job.payload || '{}');
      } catch (e) {
        payload = {};
      }

      let sucesso = false;
      let erroMsg = '';

      try {
        // Processar por tipo de job
        if (job.tipo_job === 'enviar_email') {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: payload.to,
            subject: payload.subject,
            body: payload.body
          });
          sucesso = true;

        } else if (job.tipo_job === 'enviar_notificacao') {
          await base44.asServiceRole.entities.Notificacoes.create({
            usuario_id: payload.usuario_id || '',
            usuario_email: payload.usuario_email,
            titulo: payload.titulo,
            mensagem: payload.mensagem,
            tipo: payload.tipo || 'Informação',
            modulo_origem: payload.modulo_origem || job.modulo_origem || 'Sistema',
            link_acao: payload.link_acao || ''
          });
          sucesso = true;

        } else if (job.tipo_job === 'sincronizar_app') {
          // Chamar função de sincronização externa
          const webhookUrl = payload.webhook_url || Deno.env.get('WEBHOOK_URL');
          if (webhookUrl) {
            const resp = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('ERP_SECRET_TOKEN') || ''}` },
              body: JSON.stringify(payload.dados || {})
            });
            sucesso = resp.ok;
            if (!sucesso) erroMsg = `HTTP ${resp.status}`;
          } else {
            erroMsg = 'webhook_url não configurada';
          }

        } else {
          // Tipo não implementado — marcar como erro
          erroMsg = `Tipo de job não suportado: ${job.tipo_job}`;
        }

      } catch (err) {
        erroMsg = err.message;
      }

      const maxTentativas = job.max_tentativas || 3;
      const tentativasFeitas = (job.tentativas || 0) + 1;

      if (sucesso) {
        await base44.asServiceRole.entities.JobsQueue.update(job.id, {
          status: 'Concluído',
          data_finalizacao: new Date().toISOString()
        });

        // Registrar audit log
        await base44.asServiceRole.entities.AuditLogs.create({
          acao: 'outro',
          entidade: 'JobsQueue',
          registro_id: job.id,
          modulo: job.modulo_origem || 'Sistema',
          dados_novos: JSON.stringify({ tipo_job: job.tipo_job, status: 'Concluído' }),
          data_evento: new Date().toISOString()
        });

      } else {
        const novoStatus = tentativasFeitas >= maxTentativas ? 'Erro' : 'Pendente';
        await base44.asServiceRole.entities.JobsQueue.update(job.id, {
          status: novoStatus,
          erro_mensagem: erroMsg,
          data_finalizacao: novoStatus === 'Erro' ? new Date().toISOString() : null
        });
      }

      resultados.push({ job_id: job.id, tipo: job.tipo_job, sucesso, erro: erroMsg || null });
    }

    console.log(`[JobsWorker] Ciclo concluído: ${resultados.filter(r => r.sucesso).length}/${jobs.length} jobs processados`);
    return Response.json({ success: true, processados: resultados.length, resultados });

  } catch (error) {
    console.error(`[JobsWorker] Erro crítico: ${error.message}`);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});