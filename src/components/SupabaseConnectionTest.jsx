import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function SupabaseConnectionTest() {
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  async function testarConexao() {
    setLoading(true);
    setErro(null);
    setResultado(null);

    const { data, error } = await supabase
      .from("erp_usuarios")
      .select("*")
      .limit(5);

    if (error) {
      console.error("Erro Supabase:", error);
      setErro(error.message);
    } else {
      console.log("Dados recebidos:", data);
      setResultado(data);
    }

    setLoading(false);
  }

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-3 max-w-2xl">
      <h3 className="text-base font-semibold text-slate-800">Teste de Conexão Supabase</h3>

      <Button onClick={testarConexao} disabled={loading}>
        {loading ? "Consultando..." : "Testar Conexão"}
      </Button>

      {erro && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {resultado && (
        <div className="mt-2">
          <p className="text-sm text-green-600 font-medium mb-1">
            ✓ Conexão OK — {resultado.length} registro(s) retornado(s)
          </p>
          <pre className="bg-slate-50 border border-slate-200 rounded p-3 text-xs overflow-auto max-h-64">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}