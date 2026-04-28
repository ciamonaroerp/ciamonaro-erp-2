import { listar, criar, atualizar, deletar } from "@/components/services/baseService";

export async function listarExpedicoes(empresa_id) {
  return listar("logistica_expedicoes", empresa_id);
}

export async function criarExpedicao(dados) {
  return criar("logistica_expedicoes", dados);
}

export async function atualizarExpedicao(id, dados) {
  return atualizar("logistica_expedicoes", id, dados);
}

export async function deletarExpedicao(id) {
  return deletar("logistica_expedicoes", id);
}