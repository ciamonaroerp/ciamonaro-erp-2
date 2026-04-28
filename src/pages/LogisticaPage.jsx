import React, { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/components/context/SupabaseAuthContext";
import PageHeader from "@/components/admin/PageHeader";
import LogisticaSummary from "@/components/logistica/LogisticaSummary";
import LogisticaKanban from "@/components/logistica/LogisticaKanban";

export default function LogisticaPage() {
  const { erpUsuario } = useSupabaseAuth();
  const usuarioAtual = erpUsuario;

  return (
    <div className="space-y-6">
      <PageHeader title="Logística" description="Gestão de cotações de frete" />
      <LogisticaSummary />
      <LogisticaKanban usuarioAtual={usuarioAtual} />
    </div>
  );
}