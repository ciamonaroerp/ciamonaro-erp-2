import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: contas_receber, contas_pagar
export const contasReceberService = {
  listar: (empresa_id) => listar("contas_receber", empresa_id),
  criar: (dados) => criar("contas_receber", dados),
  atualizar: (id, dados) => atualizar("contas_receber", id, dados),
  deletar: (id) => deletar("contas_receber", id),
};

export const contasPagarService = {
  listar: (empresa_id) => listar("contas_pagar", empresa_id),
  criar: (dados) => criar("contas_pagar", dados),
  atualizar: (id, dados) => atualizar("contas_pagar", id, dados),
  deletar: (id) => deletar("contas_pagar", id),
};