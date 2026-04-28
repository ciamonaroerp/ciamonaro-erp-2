import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: produtos, estoque_produtos
export const produtosPaService = {
  listar: (empresa_id) => listar("produtos", empresa_id),
  criar: (dados) => criar("produtos", dados),
  atualizar: (id, dados) => atualizar("produtos", id, dados),
  deletar: (id) => deletar("produtos", id),
};

export const estoqueProdutosService = {
  listar: (empresa_id) => listar("estoque_produtos", empresa_id),
  criar: (dados) => criar("estoque_produtos", dados),
  atualizar: (id, dados) => atualizar("estoque_produtos", id, dados),
  deletar: (id) => deletar("estoque_produtos", id),
};