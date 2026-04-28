import React, { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/components/context/SupabaseAuthContext";
import PageHeader from "@/components/admin/PageHeader";
import PpcpSummary from "@/components/ppcp/PpcpSummary";
import PpcpKanban from "@/components/ppcp/PpcpKanban";

export default function PpcpPage() {
  const { erpUsuario } = useSupabaseAuth();
  const usuarioAtual = erpUsuario;

  return (
    <div className="space-y-6">
      <PageHeader title="PPCP" description="Análise e aprovação de solicitações de produção" />
      <PpcpSummary />
      <PpcpKanban usuarioAtual={usuarioAtual} />
    </div>
  );
}