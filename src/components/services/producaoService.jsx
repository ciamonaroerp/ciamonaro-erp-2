import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: producao_etapas
export const producaoEtapasService = {
  listar: (empresa_id) => listar("producao_etapas", empresa_id),
  criar: (dados) => criar("producao_etapas", dados),
  atualizar: (id, dados) => atualizar("producao_etapas", id, dados),
  deletar: (id) => deletar("producao_etapas", id),
};