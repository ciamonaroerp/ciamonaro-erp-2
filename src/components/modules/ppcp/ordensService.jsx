import { listar, criar, atualizar, deletar } from "@/components/services/baseService";

export async function listarOrdens(empresa_id) {
  return listar("ppcp_ordens_producao", empresa_id);
}

export async function criarOrdem(dados) {
  return criar("ppcp_ordens_producao", dados);
}

export async function atualizarOrdem(id, dados) {
  return atualizar("ppcp_ordens_producao", id, dados);
}

export async function deletarOrdem(id) {
  return deletar("ppcp_ordens_producao", id);
}