import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { empresa_id, funil_id } = await req.json();
  if (!empresa_id || !funil_id) return Response.json({ error: 'empresa_id e funil_id são obrigatórios' }, { status: 400 });

  // Busca etapas existentes para não duplicar
  const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_etapas?empresa_id=eq.${empresa_id}&funil_id=eq.${funil_id}&deleted_at=is.null&select=nome`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const existentes = await res.json();
  const nomesExistentes = new Set((existentes || []).map(e => e.nome));

  const etapasPadrao = [
    { nome: 'Prospecção', ordem: 1, percentual: 10 },
    { nome: 'Qualificação', ordem: 2, percentual: 25 },
    { nome: 'Proposta', ordem: 3, percentual: 50 },
    { nome: 'Negociação', ordem: 4, percentual: 75 },
    { nome: 'Fechamento', ordem: 5, percentual: 100 },
  ];

  const paraInserir = etapasPadrao
    .filter(e => !nomesExistentes.has(e.nome))
    .map(e => ({ ...e, empresa_id, funil_id }));

  if (paraInserir.length === 0) {
    return Response.json({ message: 'Todas as etapas já existem', inseridas: 0 });
  }

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/crm_etapas`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(paraInserir),
  });

  const inseridas = await insRes.json();
  return Response.json({ message: 'Etapas inseridas com sucesso', inseridas: inseridas?.length || paraInserir.length, etapas: inseridas });
});