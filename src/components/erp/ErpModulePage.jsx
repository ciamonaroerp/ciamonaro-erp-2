/**
 * CIAMONARO ERP — Template padrão para páginas de módulo operacional.
 * Usar este componente como base para TODOS os novos módulos.
 * 
 * Props:
 * - title: Título da página
 * - description: Subtítulo/descrição
 * - tabs: Array de { value, label, content }
 * - action: Elemento React para botão de ação no header
 */
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/admin/PageHeader";

export default function ErpModulePage({ title, description, tabs = [], action, children }) {
  const [tab, setTab] = useState(tabs[0]?.value || "");

  if (children) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} action={action} />
        {children}
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} action={action} />
        <div
          className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm"
          style={{ color: '#9CA3AF' }}
        >
          Nenhum conteúdo configurado para este módulo.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} action={action} />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList style={{ background: '#F5F7FB' }} className="border border-slate-200">
          {tabs.map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              style={{ fontWeight: 500, fontSize: '13px' }}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-4 space-y-4">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}