import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarTamanhos,
  criarTamanho,
  atualizarTamanho,
  toggleAtivoTamanho,
} from "@/services/tamanhosService";
import {
  validarTamanho,
  prepararPayloadCriar,
  prepararPayloadAtualizar,
} from "@/domain/tamanhosDomain";

const QUERY_KEY = ["tamanhos-globais"];

export function useTamanhos() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listarTamanhos,
    staleTime: 0,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const criar = async (form) => {
    const erro = validarTamanho(form);
    if (erro) throw new Error(erro);
    await criarTamanho(prepararPayloadCriar(form));
    invalidar();
  };

  const atualizar = async (id, form) => {
    const erro = validarTamanho(form);
    if (erro) throw new Error(erro);
    await atualizarTamanho(id, prepararPayloadAtualizar(form));
    invalidar();
  };

  const toggleAtivo = async (id, ativoAtual) => {
    await toggleAtivoTamanho(id, ativoAtual);
    invalidar();
  };

  return {
    tamanhos: query.data || [],
    loading: query.isLoading,
    criar,
    atualizar,
    toggleAtivo,
  };
}