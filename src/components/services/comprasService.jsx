import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: fornecedores, pedidos_compra
export const fornecedoresService = {
  listar: (empresa_id) => listar("fornecedores", empresa_id),
  criar: (dados) => criar("fornecedores", dados),
  atualizar: (id, dados) => atualizar("fornecedores", id, dados),
  deletar: (id) => deletar("fornecedores", id),
};

export const pedidosCompraService = {
  listar: (empresa_id) => listar("pedidos_compra", empresa_id),
  criar: (dados) => criar("pedidos_compra", dados),
  atualizar: (id, dados) => atualizar("pedidos_compra", id, dados),
  deletar: (id) => deletar("pedidos_compra", id),
};