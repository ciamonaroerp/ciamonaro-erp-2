import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/components/lib/supabaseClient";

const SupabaseAuthContext = createContext({ ready: false, session: null, erpUsuario: null });

export function SupabaseAuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [erpUsuario, setErpUsuario] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let initialized = false;

    async function init() {
      if (initialized) return;
      initialized = true;

      try {
        if (!supabase) {
          console.warn('[SupabaseAuth] Cliente Supabase não inicializado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
          if (!cancelled) setReady(true);
          return;
        }
        
        // Limpa sessão corrompida do localStorage antes de carregar
        try {
          const stored = localStorage.getItem('erp_sb_session_v2');
          if (stored) {
            const parsed = JSON.parse(stored);
            // Se a sessão armazenada está corrompida ou expirada, limpa
            if (!parsed || !parsed.session || !parsed.session.user) {
              localStorage.removeItem('erp_sb_session_v2');
            }
          }
        } catch (e) {
          // JSON inválido, remove
          localStorage.removeItem('erp_sb_session_v2');
        }
        
        // Verifica sessão ativa no Supabase
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          if (!cancelled) setSession(currentSession);
          const email = currentSession.user.email;

          // Busca dados do usuário ERP diretamente no Supabase
          const { data, error } = await supabase
            .from('erp_usuarios')
            .select('*')
            .ilike('email', email)
            .maybeSingle();

          if (!error && data && !cancelled) {
            setErpUsuario(data);
            console.log('[SupabaseAuth] erpUsuario carregado:', data.email, data.perfil, 'empresa_id:', data.empresa_id);
          } else {
            console.warn('[SupabaseAuth] erpUsuario não encontrado para:', email, error?.message);
          }
        } else {
          if (!cancelled) setSession(null);
          console.warn('[SupabaseAuth] Sem sessão ativa no Supabase.');
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

    // Registra listener ANTES de chamar init() para não perder eventos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setErpUsuario(null);
      } else if (event === 'TOKEN_REFRESHED' && sess?.user) {
        // Apenas atualiza a sessão, não recarrega erpUsuario (já está em memória)
        if (!cancelled) setSession(sess);
        console.log('[SupabaseAuth] Token renovado para:', sess.user.email);
      } else if (event === 'SIGNED_IN' && sess?.user) {
        if (!cancelled) setSession(sess);
        const { data } = await supabase
          .from('erp_usuarios')
          .select('*')
          .ilike('email', sess.user.email)
          .maybeSingle();
        if (data && !cancelled) {
          setErpUsuario(data);
          console.log('[SupabaseAuth] erpUsuario atualizado via event:', data.email, 'empresa_id:', data.empresa_id);
        }
      }
    });

    init();

    // Quando a aba volta ao foco, verifica e renova a sessão se necessário
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          if (error || !currentSession) {
            // Sessão perdida, força logout
            setSession(null);
            setErpUsuario(null);
            return;
          }
          // Verifica se o token está próximo de expirar (menos de 5 min)
          const expiresAt = currentSession.expires_at * 1000;
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          if (expiresAt - now < fiveMinutes) {
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session) {
              setSession(refreshData.session);
            }
          } else {
            setSession(currentSession);
          }
        } catch (err) {
          console.warn('[SupabaseAuth] Erro ao verificar sessão na visibilidade:', err.message);
        }
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
  } catch (_) {
    // ignora
  }
  localStorage.removeItem('erp_sb_session_v2');
}

/** Mantém compatibilidade com código que importa getSupabase */
export function getSupabase() {
  return Promise.resolve(supabase);
}