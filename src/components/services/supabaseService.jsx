/**
 * Serviço centralizado — todas operações roteadas pelo backend (service role)
 * para evitar bloqueios de RLS no cliente frontend.
 */

import * as base from "@/components/services/baseService";

function sanitize(data, columns) {
  if (!columns) return data;
  const clean = {};
  columns.forEach(col => {
    if (data[col] !== undefined) {
      clean[col] = data[col] === '' ? null : data[col];
    }
  });
  return clean;
}

const CLIENTES_COLUMNS = [
  'empresa_id', 'codigo', 'nome_cliente', 'nome_fantasia', 'documento', 'tipo_pessoa',
  'inscricao_estadual', 'situacao_ie', 'email', 'telefone', 'celular', 'site',
  'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep',
  'limite_credito', 'condicao_pagamento', 'observacoes', 'status',
  'situacao_cadastral', 'data_abertura', 'atividade_principal', 'vendedor_id', 'vendedor_nome'
];

const CLIENTE_CONTATOS_COLUMNS = [
  'cliente_id', 'empresa_id', 'nome', 'email', 'telefone', 'celular', 'whatsapp', 'departamento', 'cargo'
];

const CLIENTE_ENDERECOS_COLUMNS = [
  'cliente_id', 'empresa_id', 'cep', 'rua', 'numero', 'complemento', 'bairro',
  'cidade', 'estado'
];

function makeService(tabela, sanitizeColumns = null) {
  return {
    list: (filters = {}) => {
      const { empresa_id, ...filtros } = filters;
      return base.listar(tabela, empresa_id || null, filtros);
    },
    get: (id) => base.buscarPorId(tabela, id),
    create: (data) => base.criar(tabela, sanitizeColumns ? sanitize(data, sanitizeColumns) : data),
    update: (id, data) => base.atualizar(tabela, id, sanitizeColumns ? sanitize(data, sanitizeColumns) : data),
    delete: (id) => base.deletar(tabela, id),
  };
}

export const transportadorasService = makeService('transportadoras');
export const clientesService = makeService('clientes', CLIENTES_COLUMNS);
export const produtosService = makeService('produtos');
export const empresasService = makeService('empresas');
export const modulosService = makeService('modulos_erp');
export const usuariosService = makeService('erp_usuarios');
export const modalidadeFreteService = makeService('modalidade_frete');
export const solicitacaoPpcpService = makeService('solicitacao_ppcp');
export const solicitacaoFreteService = makeService('solicitacao_frete');
export const notificacoesService = makeService('notificacoes');
export const auditLogsService = makeService('audit_logs');
export const clienteContatosService = makeService('cliente_contatos', CLIENTE_CONTATOS_COLUMNS);
export const clienteEnderecosService = makeService('cliente_enderecos', CLIENTE_ENDERECOS_COLUMNS);

const FORNECEDORES_COLUMNS = [
  'empresa_id', 'codigo', 'data_cadastro', 'tipo_pessoa', 'nome_fornecedor', 'nome_fantasia', 'documento',
  'inscricao_estadual', 'situacao_icms', 'email', 'telefone', 'celular',
  'endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep',
  'condicao_pagamento', 'observacoes', 'status', 'tipo_id'
];

const FORNECEDOR_CONTATOS_COLUMNS = [
  'fornecedor_id', 'empresa_id', 'nome', 'cargo', 'telefone', 'celular', 'whatsapp', 'email', 'observacao'
];

const FORNECEDOR_OBSERVACOES_COLUMNS = [
  'fornecedor_id', 'empresa_id', 'observacao', 'usuario'
];

const FORNECEDORES_PAGAMENTOS_COLUMNS = [
  'fornecedor_id', 'empresa_id', 'tipo_pagamento', 'cpf_cnpj_titular', 'banco_codigo', 'banco_nome', 'agencia', 'conta', 'pix_tipo', 'pix_chave'
];

export const fornecedoresService = makeService('fornecedores', FORNECEDORES_COLUMNS);
export const fornecedorContatosService = makeService('fornecedores_contatos', FORNECEDOR_CONTATOS_COLUMNS);
export const fornecedorObservacoesService = makeService('fornecedores_observacoes', FORNECEDOR_OBSERVACOES_COLUMNS);
export const fornecedoresPagamentosService = makeService('fornecedores_pagamentos', FORNECEDORES_PAGAMENTOS_COLUMNS);

export default { list: base.listar, create: base.criar, update: base.atualizar, delete: base.deletar };