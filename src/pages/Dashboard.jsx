import React from "react";
import { useQuery } from "@tanstack/react-query";
import { listar } from "@/components/services/baseService";
import { useEmpresa } from "@/components/context/EmpresaContext";
import { Users, Building2, Package, Boxes, Activity, TrendingUp } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import PageHeader from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { empresa_id } = useEmpresa();

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listar("erp_usuarios", null),
  });

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes", empresa_id],
    queryFn: () => listar("clientes", empresa_id),
    enabled: !!empresa_id,
  });

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ["produto_comercial", empresa_id],
    queryFn: () => listar("produto_comercial", empresa_id),
    enabled: !!empresa_id,
  });

  const { data: modulos = [], isLoading: loadingModulos } = useQuery({
    queryKey: ["modulos_erp", empresa_id],
    queryFn: () => listar("modulos_erp", empresa_id),
    enabled: !!empresa_id,
  });

  const isLoading = loadingUsuarios || loadingClientes || loadingProdutos || loadingModulos;

  const ativos = modulos.filter(m => m.status === "Ativo").length;
  const preparados = modulos.filter(m => m.status === "Preparado").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral do CIAMONARO ERP — dados em tempo real via Supabase"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard title="Usuários" value={usuarios.length} icon={Users} color="blue"
              subtitle={`${usuarios.filter(u => u.status === "Ativo").length} ativos`} />
            <StatCard title="Clientes" value={clientes.length} icon={Building2} color="emerald"
              subtitle="Base de clientes" />
            <StatCard title="Produtos" value={produtos.length} icon={Package} color="violet"
              subtitle="Cadastrados" />
            <StatCard title="Módulos ERP" value={modulos.length} icon={Boxes} color="amber"
              subtitle={`${ativos} ativos, ${preparados} preparados`} />
          </>
        )}
      </div>

      {/* Modules overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="h-5 w-5" style={{ color: '#3B5CCC' }} />
            <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>Módulos do ERP</h2>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
            ) : modulos.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>Nenhum módulo cadastrado no Supabase.</p>
            ) : (
              modulos.map(modulo => (
                <div key={modulo.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-slate-50 transition-colors" style={{ background: '#F5F7FB' }}>
                  <span className="text-sm font-medium" style={{ color: '#374151' }}>{modulo.nome_modulo}</span>
                  <Badge className={cn(
                    "text-xs font-medium rounded-full px-2.5 border",
                    modulo.status === "Ativo"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {modulo.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>Resumo do Sistema</h2>
          </div>
          <div className="space-y-0">
            {[
              { label: "Sistema", value: "CIAMONARO ERP", color: '#1F2937' },
              { label: "Versão", value: "1.0.0", color: '#1F2937' },
              { label: "Banco de Dados", value: "Supabase", color: '#3B5CCC' },
              { label: "Módulos Ativos", value: ativos, color: '#16A34A' },
              { label: "Módulos Preparados", value: preparados, color: '#D97706' },
            ].map((item, i, arr) => (
              <div key={item.label} className={cn("flex items-center justify-between py-3", i < arr.length - 1 && "border-b border-slate-100")}>
                <span className="text-sm" style={{ color: '#6B7280' }}>{item.label}</span>
                <span className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}