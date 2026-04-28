import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CondicoesComerciais from "@/components/informacoes/CondicoesComerciais";
import InformacaoComplementar from "@/components/informacoes/InformacaoComplementar";

export default function InformacoesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Informações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie as informações e condições comerciais do sistema.</p>
      </div>

      <Tabs defaultValue="condicoes" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg mb-6">
          <TabsTrigger
            value="condicoes"
            className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600"
          >
            Condições comerciais
          </TabsTrigger>
          <TabsTrigger
            value="complementar"
            className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600"
          >
            Informação Complementar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="condicoes">
          <CondicoesComerciais />
        </TabsContent>

        <TabsContent value="complementar">
          <InformacaoComplementar />
        </TabsContent>
      </Tabs>
    </div>
  );
}