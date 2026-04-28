import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/components/lib/supabaseClient';

export const useCNPJLookup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);
  const lastSearchedCNPJ = useRef(null);

  const formatCNPJ = (cnpj) => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return null;
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const validateCNPJ = (cnpj) => {
    const clean = cnpj.replace(/\D/g, '');
    return clean.length === 14;
  };

  const lookupCNPJ = useCallback(async (cnpj, onSuccess) => {
    const clean = cnpj.replace(/\D/g, '');

    // Evitar múltiplas consultas para mesmo CNPJ
    if (lastSearchedCNPJ.current === clean) return;
    if (!validateCNPJ(cnpj)) return;

    setLoading(true);
    setError(null);
    lastSearchedCNPJ.current = clean;

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!response.ok) throw new Error('CNPJ não encontrado nas bases públicas');
      const dados = await response.json();
      onSuccess(dados);
    } catch (err) {
      setError('Erro ao consultar CNPJ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedLookup = useCallback((cnpj, onSuccess) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      lookupCNPJ(cnpj, onSuccess);
    }, 800); // 800ms delay para não consultar a cada digitação
  }, [lookupCNPJ]);

  return {
    loading,
    error,
    formatCNPJ,
    validateCNPJ,
    lookupCNPJ,
    debouncedLookup,
    clearError: () => setError(null),
  };
};