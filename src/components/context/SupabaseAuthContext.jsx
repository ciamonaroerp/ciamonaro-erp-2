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
      // O onAuthStateChange com INITIAL_SESSION já cuida de setar ready e erpUsuario.
      // Este init() apenas garante que supabase está disponível.
      if (!supabase) {
        console.warn('[SupabaseAuth] Cliente Supabase não inicializado.');
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
        if (!cancelled) setReady(true);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && sess?.user) {
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
        // Marca ready após carregar erpUsuario via event
        if (!cancelled) setReady(true);
      } else if (event === 'INITIAL_SESSION' && !sess) {
        // Sem sessão no carregamento inicial
        if (!cancelled) setReady(true);
      }
    });

    init();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
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