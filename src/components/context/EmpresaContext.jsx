/**
 * CIAMONARO ERP — Contexto de Empresa (SaaS Multiempresa)
 * Deriva empresa_id do SupabaseAuthContext (erp_usuario já carregado com JWT).
 */
import React, { createContext, useContext, useMemo } from "react";
import { useSupabaseAuth } from "./SupabaseAuthContext";

const EmpresaContext = createContext({ empresa_id: null, loading: true });

// Valida se string é UUID v4 com dashes
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function EmpresaProvider({ children }) {
  const { ready, erpUsuario } = useSupabaseAuth();

  // Usa SEMPRE empresa_id do erpUsuario. VITE_EMPRESA_ID foi removido como fallback
  // pois causava registros sendo salvos na empresa errada quando usuario nao tinha empresa_id configurado.
  const empresaId = ready ? (erpUsuario?.empresa_id || null) : null;

  if (ready && !empresaId) {
    console.warn('[EmpresaContext] empresa_id não encontrado no erpUsuario. Configure empresa_id na tabela erp_usuarios para o usuário logado.');
  }

  const value = useMemo(() => ({
    empresa_id: empresaId,
    loading: !ready,
  }), [ready, empresaId]);

  return (
    <EmpresaContext.Provider value={value}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}