import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lgeigxmjastizxruerwp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZzFyJXQMdcnwB1Qg4g96rw_skyf-pon';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'erp_sb_session_v2',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Intercepta erros 400/401 globais para forçar refresh de token
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Supabase] Token renovado com sucesso.');
  }
  if (event === 'SIGNED_OUT') {
    console.warn('[Supabase] Sessão encerrada. Redirecionando para login...');
    localStorage.removeItem('erp_sb_session_v2');
    // Pequeno delay para garantir limpeza antes do redirect
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  }
});

export function getSupabase() {
  return Promise.resolve(supabase);
}

/**
 * Wrapper para queries Supabase com retry automático em caso de 401/400.
 * Tenta renovar o token e refazer a query uma vez antes de falhar.
 */
export async function supabaseQuery(queryFn) {
  const result = await queryFn();
  
  if (result.error?.status === 401 || result.error?.status === 400) {
    // Tenta renovar o token
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      // Retry após refresh
      return await queryFn();
    }
  }
  
  return result;
}