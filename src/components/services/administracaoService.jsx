import { listar, criar, atualizar, deletar } from "./baseService";

// Tabela: erp_usuarios
export const usuariosErpService = {
  listar: (empresa_id) => listar("erp_usuarios", empresa_id),
  criar: (dados) => criar("erp_usuarios", dados),
  atualizar: (id, dados) => atualizar("erp_usuarios", id, dados),
  deletar: (id) => deletar("erp_usuarios", id),
};

// Tabela: empresas
export const empresasService = {
  listar: (empresa_id) => listar("empresas", empresa_id),
  criar: (dados) => criar("empresas", dados),
  atualizar: (id, dados) => atualizar("empresas", id, dados),
  deletar: (id) => deletar("empresas", id),
};

// Tabela: perfis_acesso
export const perfisAcessoService = {
  listar: (empresa_id) => listar("perfis_acesso", empresa_id),
  criar: (dados) => criar("perfis_acesso", dados),
  atualizar: (id, dados) => atualizar("perfis_acesso", id, dados),
  deletar: (id) => deletar("perfis_acesso", id),
};

// Tabela: modulos_erp
export const modulosErpService = {
  listar: (empresa_id) => listar("modulos_erp", empresa_id),
  criar: (dados) => criar("modulos_erp", dados),
  atualizar: (id, dados) => atualizar("modulos_erp", id, dados),
  deletar: (id) => deletar("modulos_erp", id),
};

// Tabela: configuracoes_erp
export const configuracoesService = {
  listar: (empresa_id) => listar("configuracoes_erp", empresa_id),
  criar: (dados) => criar("configuracoes_erp", dados),
  atualizar: (id, dados) => atualizar("configuracoes_erp", id, dados),
  deletar: (id) => deletar("configuracoes_erp", id),
};

// Tabela: integracoes_erp
export const integracoesErpService = {
  listar: (empresa_id) => listar("integracoes_erp", empresa_id),
  criar: (dados) => criar("integracoes_erp", dados),
  atualizar: (id, dados) => atualizar("integracoes_erp", id, dados),
  deletar: (id) => deletar("integracoes_erp", id),
};

// Tabela: logs_auditoria (somente leitura na UI)
export const logsAuditoriaService = {
  listar: (empresa_id) => listar("logs_auditoria", empresa_id),
  criar: (dados) => criar("logs_auditoria", dados),
};

// Tabela: clientes (cadastro mestre)
export const clientesCadastroService = {
  listar: (empresa_id) => listar("clientes", empresa_id),
  criar: (dados) => criar("clientes", dados),
  atualizar: (id, dados) => atualizar("clientes", id, dados),
  deletar: (id) => deletar("clientes", id),
};

// Tabela: transportadoras
export const transportadorasService = {
  listar: (empresa_id) => listar("transportadoras", empresa_id),
  criar: (dados) => criar("transportadoras", dados),
  atualizar: (id, dados) => atualizar("transportadoras", id, dados),
  deletar: (id) => deletar("transportadoras", id),
};

// Tabela: modalidade_frete
export const modalidadeFreteService = {
  listar: (empresa_id) => listar("modalidade_frete", empresa_id),
  criar: (dados) => criar("modalidade_frete", dados),
  atualizar: (id, dados) => atualizar("modalidade_frete", id, dados),
  deletar: (id) => deletar("modalidade_frete", id),
};

// Tabela: deploy_versions
export const deployVersionsService = {
  listar: (empresa_id) => listar("deploy_versions", empresa_id),
  criar: (dados) => criar("deploy_versions", dados),
  atualizar: (id, dados) => atualizar("deploy_versions", id, dados),
  deletar: (id) => deletar("deploy_versions", id),
};

// Tabela: audit_logs
export const auditLogsService = {
  listar: (empresa_id) => listar("audit_logs", empresa_id),
  criar: (dados) => criar("audit_logs", dados),
  atualizar: (id, dados) => atualizar("audit_logs", id, dados),
};