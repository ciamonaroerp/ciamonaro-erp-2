import { listar, criar, atualizar, deletar } from "./baseService";

// Tabelas: ordens_producao
// Status possíveis: planejado | em_producao | finalizado
export const ordensProducaoService = {
  listar: (empresa_id) => listar("ordens_producao", empresa_id),
  listarPorStatus: (empresa_id, status) => listar("ordens_producao", empresa_id, { status }),
  criar: (dados) => criar("ordens_producao", dados),
  atualizar: (id, dados) => atualizar("ordens_producao", id, dados),
  deletar: (id) => deletar("ordens_producao", id),
};