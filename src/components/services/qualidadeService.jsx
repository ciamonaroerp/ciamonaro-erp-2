import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: controle_qualidade
export const controleQualidadeService = {
  listar: (empresa_id) => listar("controle_qualidade", empresa_id),
  criar: (dados) => criar("controle_qualidade", dados),
  atualizar: (id, dados) => atualizar("controle_qualidade", id, dados),
  deletar: (id) => deletar("controle_qualidade", id),
};