import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: materias_primas, estoque_materia_mov
export const materiasPrimasService = {
  listar: (empresa_id) => listar("materias_primas", empresa_id),
  criar: (dados) => criar("materias_primas", dados),
  atualizar: (id, dados) => atualizar("materias_primas", id, dados),
  deletar: (id) => deletar("materias_primas", id),
};

export const estoqueMpMovService = {
  listar: (empresa_id) => listar("estoque_materia_mov", empresa_id),
  criar: (dados) => criar("estoque_materia_mov", dados),
  atualizar: (id, dados) => atualizar("estoque_materia_mov", id, dados),
  deletar: (id) => deletar("estoque_materia_mov", id),
};