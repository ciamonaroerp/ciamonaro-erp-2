import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/components/lib/supabaseClient";

const SupabaseAuthContext = createContext({ ready: false, session: null, erpUsuario: null });

async function fetchErpUsuario(email) {
  const { data, error } = await supabase
    .from('erp_usuarios')
    .select('*')
    .ilike('email', email)
    .maybeSingle();
  if (error) console.warn('[SupabaseAuth] Erro ao buscar erpUsuario:', error.message);
  return data || null;
}

export function SupabaseAuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [erpUsuario, setErpUsuario] = useState(null);

  // Refs para preservar valores durante suspensão de aba
  const erpUsuarioRef = useRef(null);
  const sessionRef = useRef(null);

  const updateErpUsuario = (data) => {
    erpUsuarioRef.current = data;
    setErpUsuario(data);
  };

  const updateSession = (sess) => {
    sessionRef.current = sess;
    setSession(sess);
  };

  useEffect(() => {
    let cancelled = false;

    // Tenta obter sessão válida, com fallback para refreshSession
    async function getValidSession() {
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (sess) return sess;

      // Tenta renovar se não encontrou sessão diretamente
      const { data: refreshData } = await supabase.auth.refreshSession();
      return refreshData?.session || null;
    }

    async function loadErpUsuario(email) {
      const data = await fetchErpUsuario(email);
      if (data && !cancelled) {
        updateErpUsuario(data);
        console.log('[SupabaseAuth] erpUsuario carregado:', data.email, 'empresa_id:', data.empresa_id);
      }
      return data;
    }

    async function init() {
      try {
        if (!supabase) {
          if (!cancelled) setReady(true);
          return;
        }

        // Limpa sessão corrompida do localStorage
        try {
          const stored = localStorage.getItem('erp_sb_session_v2');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (!parsed?.session?.user) localStorage.removeItem('erp_sb_session_v2');
          }
        } catch {
          localStorage.removeItem('erp_sb_session_v2');
        }

        const currentSession = await getValidSession();

        if (currentSession?.user) {
          if (!cancelled) updateSession(currentSession);
          await loadErpUsuario(currentSession.user.email);
        } else {
          if (!cancelled) updateSession(null);
        }
      } catch (err) {
        console.warn('[SupabaseAuth] Erro ao inicializar:', err.message);
        if (!cancelled) updateSession(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    if (!supabase) {
      init();
      return () => { cancelled = true; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (cancelled) return;
      console.log('[SupabaseAuth] evento:', event, sess?.user?.email);

      if (event === 'SIGNED_OUT') {
        updateSession(null);
        updateErpUsuario(null);

      } else if (event === 'TOKEN_REFRESHED' && sess?.user) {
        updateSession(sess);
        // Restaura erpUsuario se foi perdido
        if (!erpUsuarioRef.current) {
          await loadErpUsuario(sess.user.email);
        }

      } else if (event === 'SIGNED_IN' && sess?.user) {
        updateSession(sess);
        // Só recarrega se não tiver erpUsuario OU se for outro email
        const emailAtual = erpUsuarioRef.current?.email?.toLowerCase();
        if (!erpUsuarioRef.current || emailAtual !== sess.user.email.toLowerCase()) {
          await loadErpUsuario(sess.user.email);
        }
      }
    });

    init();

    // Restaura sessão e erpUsuario ao voltar para a aba
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || cancelled) return;

      try {
        // Se já tem sessão e erpUsuario em memória, só verifica token
        if (sessionRef.current && erpUsuarioRef.current) {
          const expiresAt = sessionRef.current.expires_at * 1000;
          if (expiresAt - Date.now() < 10 * 60 * 1000) {
            supabase.auth.refreshSession(); // fire and forget
          }
          return;
        }

        // Sessão ou erpUsuario perdidos — tenta restaurar
        console.log('[SupabaseAuth] Restaurando sessão ao voltar para a aba...');
        const currentSession = await getValidSession();

        if (!currentSession) {
          // Nenhuma sessão disponível — mantém o que tem em ref para evitar logout desnecessário
          // O listener onAuthStateChange irá tratar SIGNED_OUT se necessário
          console.warn('[SupabaseAuth] Nenhuma sessão encontrada ao restaurar.');
          return;
        }

        if (!cancelled) updateSession(currentSession);

        if (!erpUsuarioRef.current && currentSession.user?.email) {
          await loadErpUsuario(currentSession.user.email);
        }
      } catch (err) {
        console.warn('[SupabaseAuth] Erro ao restaurar sessão:', err.message);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <SupabaseAuthContext.Provider value={{ ready, session, erpUsuario }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}

export async function clearSupabaseSession() {
  try {
    if (supabase) await supabase.auth.signOut();
  } catch (_) { }
  localStorage.removeItem('erp_sb_session_v2');
}

export function getSupabase() {
  return Promise.resolve(supabase);
}