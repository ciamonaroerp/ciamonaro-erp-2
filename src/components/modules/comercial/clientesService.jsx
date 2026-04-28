import { listar, criar, atualizar, deletar } from "@/components/services/baseService";

const TABELA = "clientes";

export async function listarClientes(empresa_id) {
  return listar(TABELA, empresa_id);
}

export async function criarCliente(cliente) {
  return criar(TABELA, cliente);
}

export async function atualizarCliente(id, dados) {
  return atualizar(TABELA, id, dados);
}

export async function deletarCliente(id) {
  return deletar(TABELA, id);
}