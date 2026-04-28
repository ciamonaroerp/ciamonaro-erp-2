/**
 * Automation: disparada quando um User do Base44 é CRIADO (convite aceito).
 * Atualiza o status do registro correspondente em erp_usuarios no Supabase para "Ativo".
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { event, data } = body;

    console.log('[onUsuarioAtivado] Evento recebido:', event?.type, 'email:', data?.email);

    const email = data?.email;
    if (!email) {
      return Response.json({ ok: true, msg: 'sem email no payload' });
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('VITE_SUPABASE_ANON_KEY')
    );

    const { error } = await supabase
      .from('erp_usuarios')
      .update({ status: 'Ativo' })
      .eq('email', email)
      .in('status', ['Pendente', 'Enviado']);

    if (error) {
      console.error('[onUsuarioAtivado] Erro Supabase:', error.message);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[onUsuarioAtivado] Status atualizado para Ativo: ${email}`);
    return Response.json({ ok: true, email });
  } catch (err) {
    console.error('[onUsuarioAtivado] Exceção:', err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
});