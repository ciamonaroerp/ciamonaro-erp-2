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

  // Ref para evitar perda do erpUsuario entre re-renders e eventos assíncronos
  const erpUsuarioRef = useRef(null);

  const updateErpUsuario = (data) => {
    erpUsuarioRef.current = data;
    setErpUsuario(data);
  };

  useEffect(() => {
    let cancelled = false;

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

        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          if (!cancelled) setSession(currentSession);
          const data = await fetchErpUsuario(currentSession.user.email);
          if (data && !cancelled) {
            updateErpUsuario(data);
            console.log('[SupabaseAuth] erpUsuario carregado:', data.email, 'empresa_id:', data.empresa_id);
          }
        } else {
          if (!cancelled) setSession(null);
        }
      } catch (err) {
        console.warn('[SupabaseAuth] Erro ao inicializar:', err.message);
        if (!cancelled) setSession(null);
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

      if (event === 'SIGNED_OUT') {
        setSession(null);
        updateErpUsuario(null);
      } else if (event === 'TOKEN_REFRESHED' && sess?.user) {
        setSession(sess);
        // Se erpUsuario foi perdido (ex: após suspend), recarrega
        if (!erpUsuarioRef.current) {
          const data = await fetchErpUsuario(sess.user.email);
          if (data && !cancelled) {
            updateErpUsuario(data);
            console.log('[SupabaseAuth] erpUsuario restaurado após TOKEN_REFRESHED:', data.email);
          }
        }
      } else if (event === 'SIGNED_IN' && sess?.user) {
        setSession(sess);
        const data = await fetchErpUsuario(sess.user.email);
        if (data && !cancelled) {
          updateErpUsuario(data);
          console.log('[SupabaseAuth] erpUsuario atualizado via SIGNED_IN:', data.email, 'empresa_id:', data.empresa_id);
        }
      }
    });

    init();

    // Quando a aba volta ao foco, verifica sessão e restaura erpUsuario se necessário
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || cancelled) return;
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error || !currentSession) {
          setSession(null);
          updateErpUsuario(null);
          return;
        }

        // Atualiza sessão sem apagar erpUsuario
        setSession(currentSession);

        // Restaura erpUsuario se foi perdido durante a suspensão
        if (!erpUsuarioRef.current && currentSession.user?.email) {
          const data = await fetchErpUsuario(currentSession.user.email);
          if (data && !cancelled) {
            updateErpUsuario(data);
            console.log('[SupabaseAuth] erpUsuario restaurado ao voltar para aba:', data.email);
          }
        }

        // Renova token se próximo de expirar (menos de 10 min)
        const expiresAt = currentSession.expires_at * 1000;
        const tenMinutes = 10 * 60 * 1000;
        if (expiresAt - Date.now() < tenMinutes) {
          supabase.auth.refreshSession(); // fire and forget, o listener cuida do estado
        }
      } catch (err) {
        console.warn('[SupabaseAuth] Erro ao verificar sessão na visibilidade:', err.message);
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