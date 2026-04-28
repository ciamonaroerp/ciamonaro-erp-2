import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: expedicoes
export const expedicoesService = {
  listar: (empresa_id) => listar("expedicoes", empresa_id),
  criar: (dados) => criar("expedicoes", dados),
  atualizar: (id, dados) => atualizar("expedicoes", id, dados),
  deletar: (id) => deletar("expedicoes", id),
};