import React, { useState, useEffect } from "react";
import { getSupabase } from "@/components/lib/supabaseClient";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LogisticaCadastros() {
  const [transportadoras, setTransportadoras] = useState([]);
  const [novaTransportadora, setNovaTransportadora] = useState({
    nome: "",
    contato: "",
    telefone: "",
  });
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTransportadoras();
  }, []);

  const carregarTransportadoras = async () => {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("transportadoras")
        .select("*")
        .order("nome", { ascending: true });

      setTransportadoras(data || []);
    } catch (error) {
      console.error("Erro ao carregar transportadoras:", error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarTransportadora = async () => {
    if (!novaTransportadora.nome || !novaTransportadora.telefone) {
      alert("Preencha nome e telefone");
      return;
    }

    try {
      const supabase = await getSupabase();

      if (editandoId) {
        await supabase
          .from("transportadoras")
          .update(novaTransportadora)
          .eq("id", editandoId);
        setEditandoId(null);
      } else {
        await supabase.from("transportadoras").insert([novaTransportadora]);
      }

      setNovaTransportadora({ nome: "", contato: "", telefone: "" });
      await carregarTransportadoras();
    } catch (error) {
      console.error("Erro ao salvar transportadora:", error);
      alert("Erro ao salvar transportadora");
    }
  };

  const deletarTransportadora = async (id) => {
    if (!window.confirm("Tem certeza que deseja deletar esta transportadora?"))
      return;

    try {
      const supabase = await getSupabase();
      await supabase.from("transportadoras").delete().eq("id", id);

      await carregarTransportadoras();
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  const editar = (transportadora) => {
    setNovaTransportadora(transportadora);
    setEditandoId(transportadora.id);
  };

  const cancelar = () => {
    setNovaTransportadora({ nome: "", contato: "", telefone: "" });
    setEditandoId(null);
  };

  if (loading) {
    return <div className="p-4 text-slate-500">Carregando...</div>;
  }

  return (
    <Tabs defaultValue="transportadoras" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="transportadoras">Transportadoras</TabsTrigger>
        <TabsTrigger value="modalidades">Modalidades</TabsTrigger>
      </TabsList>

      <TabsContent value="transportadoras" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {editandoId ? "Editar" : "Adicionar"} Transportadora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nome da transportadora"
              value={novaTransportadora.nome}
              onChange={e =>
                setNovaTransportadora(p => ({ ...p, nome: e.target.value }))
              }
            />
            <Input
              placeholder="Contato"
              value={novaTransportadora.contato}
              onChange={e =>
                setNovaTransportadora(p => ({ ...p, contato: e.target.value }))
              }
            />
            <Input
              placeholder="Telefone"
              value={novaTransportadora.telefone}
              onChange={e =>
                setNovaTransportadora(p => ({ ...p, telefone: e.target.value }))
              }
            />

            <div className="flex gap-2">
              <Button
                onClick={adicionarTransportadora}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editandoId ? "Atualizar" : "Adicionar"}
              </Button>
              {editandoId && (
                <Button onClick={cancelar} variant="outline">
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {transportadoras.map(t => (
            <Card key={t.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{t.nome}</p>
                    <p className="text-sm text-slate-600">Contato: {t.contato}</p>
                    <p className="text-sm text-slate-600">Tel: {t.telefone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => editar(t)}
                      size="sm"
                      variant="outline"
                      className="gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => deletarTransportadora(t.id)}
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="modalidades" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Modalidades de Transporte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                As seguintes modalidades estão disponíveis:
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Rodoviário
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Aéreo
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  Marítimo
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}