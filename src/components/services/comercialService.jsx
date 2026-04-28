import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: clientes, pedidos, pedidos_itens
export const clientesService = {
  listar: (empresa_id) => listar("clientes", empresa_id),
  criar: (dados) => criar("clientes", dados),
  atualizar: (id, dados) => atualizar("clientes", id, dados),
  deletar: (id) => deletar("clientes", id),
};

export const pedidosService = {
  listar: (empresa_id) => listar("pedidos", empresa_id),
  criar: (dados) => criar("pedidos", dados),
  atualizar: (id, dados) => atualizar("pedidos", id, dados),
  deletar: (id) => deletar("pedidos", id),
};

export const pedidosItensService = {
  listar: (empresa_id) => listar("pedidos_itens", empresa_id),
  criar: (dados) => criar("pedidos_itens", dados),
  atualizar: (id, dados) => atualizar("pedidos_itens", id, dados),
  deletar: (id) => deletar("pedidos_itens", id),
};