/**
 * Sincroniza o status dos erp_usuarios: se o email já tem conta ativa no Base44,
 * atualiza o status de Pendente/Enviado para Ativo no Supabase.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Lista todos os usuários do Base44
    const base44Users = await base44.asServiceRole.entities.User.list();
    const emailsAtivos = new Set(base44Users.map(u => u.email?.toLowerCase()).filter(Boolean));

    const supabaseAdmin = createClient(
     Deno.env.get('VITE_SUPABASE_URL'),
     Deno.env.get('SUPABASE_SERVICE_KEY'),
     {
       auth: { autoRefreshToken: false, persistSession: false }
     }
    );

    // Busca erp_usuarios com status Pendente ou Enviado (usando service role)
    const { data: pendentes, error: errList } = await supabaseAdmin
     .from('erp_usuarios')
     .select('id, email, status')
     .in('status', ['Pendente', 'Enviado']);

    if (errList) throw new Error(errList.message);

    let atualizados = 0;
    for (const u of (pendentes || [])) {
     if (emailsAtivos.has(u.email?.toLowerCase())) {
       await supabaseAdmin.from('erp_usuarios').update({ status: 'Ativo' }).eq('id', u.id);
       atualizados++;
       console.log(`[sync] ${u.email} → Ativo`);
     }
    }

    return Response.json({ ok: true, atualizados, total_pendentes: pendentes?.length || 0 });
  } catch (err) {
    console.error('[sincronizarStatus] Erro:', err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
});