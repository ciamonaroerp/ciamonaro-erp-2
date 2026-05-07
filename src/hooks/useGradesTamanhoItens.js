import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarItensPorGrade,
  criarItem,
  atualizarItem,
  removerItem,
  toggleAtivoItem,
} from "@/services/gradesTamanhoItensService";
import {
  validarItem,
  prepararPayloadCriar,
  prepararPayloadAtualizar,
} from "@/domain/gradesTamanhoItensDomain";

export function useGradesTamanhoItens(gradeId) {
  const queryClient = useQueryClient();
  const queryKey = ["grades-tamanho-itens", gradeId];

  const query = useQuery({
    queryKey,
    queryFn: () => listarItensPorGrade(gradeId),
    enabled: !!gradeId,
    staleTime: 0,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey });

  const criar = async (form, tamanhoSelecionado) => {
    const erro = validarItem(form);
    if (erro) throw new Error(erro);
    await criarItem(prepararPayloadCriar(gradeId, form, tamanhoSelecionado));
    invalidar();
  };

  const atualizar = async (id, form, tamanhoSelecionado) => {
    const erro = validarItem(form);
    if (erro) throw new Error(erro);
    await atualizarItem(id, prepararPayloadAtualizar(form, tamanhoSelecionado));
    invalidar();
  };

  const remover = async (id) => {
    await removerItem(id);
    invalidar();
  };

  const toggleAtivo = async (id, ativoAtual) => {
    await toggleAtivoItem(id, ativoAtual);
    invalidar();
  };

  return {
    itens: query.data || [],
    loading: query.isLoading,
    criar,
    atualizar,
    remover,
    toggleAtivo,
  };
}