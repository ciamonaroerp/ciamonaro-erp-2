import { useState } from "react";

export function useCEPLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookupCEP = async (cep, onSuccess) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setError("CEP não encontrado.");
        return;
      }
      onSuccess({
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "",
        complemento: data.complemento || "",
      });
    } catch {
      setError("Erro ao consultar CEP.");
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { loading, error, lookupCEP, clearError };
}