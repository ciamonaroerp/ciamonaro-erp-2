// Hook: gerencia estado e operações de Grades de Tamanho
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listarGrades, criarGrade, atualizarGrade, toggleAtivoGrade } from "@/services/gradesTamanhoService";
import { prepararPayloadCriar, prepararPayloadAtualizar, validarGrade } from "@/domain/gradesTamanhoDomain";

const QUERY_KEY = "grades-tamanho";

export function useGradesTamanho() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: listarGrades,
    staleTime: 0,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const criar = async (form) => {
    const erro = validarGrade(form);
    if (erro) throw new Error(erro);
    const payload = prepararPayloadCriar(form);
    await criarGrade(payload);
    invalidar();
  };

  const atualizar = async (id, form) => {
    const erro = validarGrade(form);
    if (erro) throw new Error(erro);
    const payload = prepararPayloadAtualizar(form);
    await atualizarGrade(id, payload);
    invalidar();
  };

  const toggleAtivo = async (id, ativoAtual) => {
    await toggleAtivoGrade(id, ativoAtual);
    invalidar();
  };

  return {
    grades: query.data || [],
    loading: query.isLoading,
    criar,
    atualizar,
    toggleAtivo,
  };
}