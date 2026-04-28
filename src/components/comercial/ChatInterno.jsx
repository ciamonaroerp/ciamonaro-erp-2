import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { supabase } from "@/components/lib/supabaseClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChatInterno({ 
  solicitacaoId, 
  tipo, 
  statusAtual,
  usuarioEmail,
  usuarioNome,
  onMessageAdded
}) {
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const scrollRef = useRef(null);

  const chatAtivoParaPPCP = [
    "Enviado ao PPCP",
    "Em análise",
    "Ajustes",
  ].includes(statusAtual);

  const chatAtivoParaLogistica = statusAtual === "Ajustes";

  const podeEnviarMensagem =
    (tipo === "PPCP" && chatAtivoParaPPCP) ||
    (tipo === "Frete" && chatAtivoParaLogistica) ||
    (tipo === "PPCP" && !statusAtual); // Permitir sempre no PPCP se não houver status

  useEffect(() => {
    if (usuarioEmail && usuarioNome) {
      setUsuarioAtual({ email: usuarioEmail, full_name: usuarioNome });
    }
    carregarMensagens();
  }, [solicitacaoId, usuarioEmail]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const carregarMensagens = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("chatcomercial")
        .select("*")
        .eq("solicitacao_id", solicitacaoId)
        .eq("tipo_solicitacao", tipo)
        .order("data_hora", { ascending: true });

      setMensagens(data || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async (e) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !usuarioAtual) return;

    try {
      setEnviando(true);
      const { error } = await supabase.from("chatcomercial").insert([
        {
          solicitacao_id: solicitacaoId,
          tipo_solicitacao: tipo,
          usuario_email: usuarioAtual.email,
          usuario_nome: usuarioAtual.full_name,
          mensagem: novaMensagem,
          data_hora: new Date().toISOString(),
          empresa_id: window.localStorage.getItem("empresa_id") || null,
        },
      ]);

      if (error) throw error;

      setNovaMensagem("");
      await carregarMensagens();

      if (onMessageAdded) onMessageAdded();

      // Notificação removida (dependia do base44)
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-slate-500">Carregando chat...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-50"
      >
        {mensagens.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Nenhuma mensagem ainda
          </p>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className="flex flex-col text-xs"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-slate-900">
                  {msg.usuario_nome}
                </span>
                <span className="text-slate-400">
                  {format(new Date(msg.data_hora), "HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <p className="text-slate-700 mt-1 break-words">
                {msg.mensagem}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      {podeEnviarMensagem ? (
        <form onSubmit={enviarMensagem} className="p-3 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={enviando}
              className="text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!novaMensagem.trim() || enviando}
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t bg-slate-50 text-xs text-slate-500 text-center">
          Chat não disponível para este status
        </div>
      )}
    </div>
  );
}