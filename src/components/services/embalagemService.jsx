import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: embalagens
export const embalagensService = {
  listar: (empresa_id) => listar("embalagens", empresa_id),
  criar: (dados) => criar("embalagens", dados),
  atualizar: (id, dados) => atualizar("embalagens", id, dados),
  deletar: (id) => deletar("embalagens", id),
};