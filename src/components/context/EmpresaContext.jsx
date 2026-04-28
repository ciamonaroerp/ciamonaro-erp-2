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

  // Usa empresa_id do erpUsuario; só usa VITE_EMPRESA_ID como fallback se for UUID válido
  const viteEmpresaId = import.meta.env.VITE_EMPRESA_ID;
  const empresaId = ready
    ? (erpUsuario?.empresa_id || (isValidUUID(viteEmpresaId) ? viteEmpresaId : null))
    : null;

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