import { listar, criar, atualizar, deletar } from "@/components/services/baseService";

export async function listarContasReceber(empresa_id) {
  return listar("financeiro_receber", empresa_id);
}

export async function criarContaReceber(dados) {
  return criar("financeiro_receber", dados);
}

export async function atualizarContaReceber(id, dados) {
  return atualizar("financeiro_receber", id, dados);
}

export async function deletarContaReceber(id) {
  return deletar("financeiro_receber", id);
}