/**
 * CIAMONARO ERP — Schema oficial do banco de dados Supabase
 *
 * REGRA: Nunca criar tabelas automaticamente.
 * Execute os SQLs abaixo manualmente no Supabase → SQL Editor.
 *
 * Todas as tabelas possuem:
 *   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   - empresa_id uuid NOT NULL (filtro multiempresa obrigatório)
 *   - created_at timestamptz DEFAULT now()
 *   - updated_at timestamptz DEFAULT now()
 */

export const DATABASE_SCHEMA = {
  /* ─────────── ADMINISTRAÇÃO ─────────── */
  empresas: {
    modulo: "Administração",
    tabela: "empresas",
    sql: `
CREATE TABLE IF NOT EXISTS empresas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL,
  nome        text NOT NULL,
  cnpj        text,
  email       text,
  telefone    text,
  plano       text DEFAULT 'basico',
  status      text DEFAULT 'Ativo',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX ON empresas (empresa_id);
`.trim(),
  },

  usuarios: {
    modulo: "Administração",
    tabela: "usuarios",
    sql: `
CREATE TABLE IF NOT EXISTS usuarios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          uuid NOT NULL,
  nome                text NOT NULL,
  email               text NOT NULL,
  perfil              text DEFAULT 'usuario',
  modulo_origem       text,
  modulos_autorizados text[],
  status              text DEFAULT 'Ativo',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE INDEX ON usuarios (empresa_id);
CREATE UNIQUE INDEX ON usuarios (empresa_id, email);
`.trim(),
  },

  /* ─────────── COMERCIAL ─────────── */
  clientes: {
    modulo: "Comercial",
    tabela: "clientes",
    sql: `
  CREATE TABLE IF NOT EXISTS clientes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            uuid NOT NULL,
  codigo                text,
  nome_cliente          text NOT NULL,
  nome_fantasia         text,
  documento             text,
  tipo_pessoa           text DEFAULT 'PJ',
  inscricao_estadual    text,
  situacao_ie           text DEFAULT 'Não Contribuinte',
  email                 text,
  telefone              text,
  celular               text,
  site                  text,
  endereco              text,
  numero                text,
  complemento           text,
  bairro                text,
  cidade                text,
  estado                text,
  cep                   text,
  limite_credito        numeric(12,2) DEFAULT 0,
  condicao_pagamento    text,
  observacoes           text,
  status                text DEFAULT 'Ativo',
  situacao_cadastral    text,
  data_abertura         text,
  atividade_principal   text,
  vendedor_id           uuid,
  vendedor_nome         text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
  );
  CREATE INDEX ON clientes (empresa_id);
  `.trim(),
  },

  pedidos: {
    modulo: "Comercial",
    tabela: "pedidos",
    sql: `
CREATE TABLE IF NOT EXISTS pedidos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL,
  numero_pedido  text,
  cliente_nome   text NOT NULL,
  data_pedido    date,
  valor_total    numeric(12,2),
  status         text DEFAULT 'Rascunho',
  observacoes    text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX ON pedidos (empresa_id);
`.trim(),
  },

  pedidos_itens: {
    modulo: "Comercial",
    tabela: "pedidos_itens",
    sql: `
CREATE TABLE IF NOT EXISTS pedidos_itens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL,
  pedido_id   uuid REFERENCES pedidos(id) ON DELETE CASCADE,
  produto     text,
  quantidade  numeric(10,3),
  preco_unit  numeric(12,2),
  total       numeric(12,2),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX ON pedidos_itens (empresa_id);
CREATE INDEX ON pedidos_itens (pedido_id);
`.trim(),
  },

  /* ─────────── FINANCEIRO ─────────── */
  contas_receber: {
    modulo: "Financeiro",
    tabela: "contas_receber",
    sql: `
CREATE TABLE IF NOT EXISTS contas_receber (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL,
  descricao        text NOT NULL,
  cliente_nome     text,
  valor            numeric(12,2) NOT NULL,
  data_vencimento  date,
  data_pagamento   date,
  status           text DEFAULT 'Pendente',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX ON contas_receber (empresa_id);
`.trim(),
  },

  contas_pagar: {
    modulo: "Financeiro",
    tabela: "contas_pagar",
    sql: `
CREATE TABLE IF NOT EXISTS contas_pagar (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL,
  descricao        text NOT NULL,
  fornecedor_nome  text,
  valor            numeric(12,2) NOT NULL,
  data_vencimento  date,
  data_pagamento   date,
  status           text DEFAULT 'Pendente',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX ON contas_pagar (empresa_id);
`.trim(),
  },

  /* ─────────── COMPRAS ─────────── */
  fornecedores: {
    modulo: "Compras",
    tabela: "fornecedores",
    sql: `
CREATE TABLE IF NOT EXISTS fornecedores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL,
  nome_fornecedor  text NOT NULL,
  cnpj             text,
  email            text,
  telefone         text,
  cidade           text,
  estado           text,
  status           text DEFAULT 'Ativo',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX ON fornecedores (empresa_id);
`.trim(),
  },

  pedidos_compra: {
    modulo: "Compras",
    tabela: "pedidos_compra",
    sql: `
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL,
  numero_pedido    text,
  fornecedor_nome  text NOT NULL,
  data_pedido      date,
  valor_total      numeric(12,2),
  status           text DEFAULT 'Rascunho',
  observacoes      text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX ON pedidos_compra (empresa_id);
`.trim(),
  },

  /* ─────────── ESTOQUE MATÉRIA PRIMA ─────────── */
  materias_primas: {
    modulo: "Estoque MP",
    tabela: "materias_primas",
    sql: `
CREATE TABLE IF NOT EXISTS materias_primas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL,
  codigo          text,
  descricao       text NOT NULL,
  unidade         text,
  estoque_atual   numeric(10,3) DEFAULT 0,
  estoque_minimo  numeric(10,3) DEFAULT 0,
  status          text DEFAULT 'Ativo',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX ON materias_primas (empresa_id);
`.trim(),
  },

  estoque_materia_mov: {
    modulo: "Estoque MP",
    tabela: "estoque_materia_mov",
    sql: `
CREATE TABLE IF NOT EXISTS estoque_materia_mov (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL,
  materia_prima  text NOT NULL,
  tipo_mov       text NOT NULL,
  quantidade     numeric(10,3) NOT NULL,
  data_mov       date,
  motivo         text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX ON estoque_materia_mov (empresa_id);
`.trim(),
  },

  /* ─────────── ESTOQUE PRODUTO ACABADO ─────────── */
  produtos: {
    modulo: "Estoque PA",
    tabela: "produtos",
    sql: `
CREATE TABLE IF NOT EXISTS produtos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL,
  codigo       text,
  descricao    text NOT NULL,
  categoria    text,
  unidade      text,
  preco_venda  numeric(12,2),
  status       text DEFAULT 'Ativo',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX ON produtos (empresa_id);
`.trim(),
  },

  estoque_produtos: {
    modulo: "Estoque PA",
    tabela: "estoque_produtos",
    sql: `
CREATE TABLE IF NOT EXISTS estoque_produtos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         uuid NOT NULL,
  produto_descricao  text NOT NULL,
  tipo_mov           text NOT NULL,
  quantidade         numeric(10,3) NOT NULL,
  lote               text,
  observacao         text,
  created_at         timestamptz DEFAULT now()
);
CREATE INDEX ON estoque_produtos (empresa_id);
`.trim(),
  },

  /* ─────────── PPCP ─────────── */
  ordens_producao: {
    modulo: "PPCP",
    tabela: "ordens_producao",
    sql: `
CREATE TABLE IF NOT EXISTS ordens_producao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            uuid NOT NULL,
  numero_ordem          text,
  produto               text NOT NULL,
  quantidade            numeric(10,3) NOT NULL,
  data_inicio_prevista  date,
  data_fim_prevista     date,
  status                text DEFAULT 'planejado',
  observacoes           text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
CREATE INDEX ON ordens_producao (empresa_id);
-- Status permitidos: planejado | em_producao | finalizado
`.trim(),
  },

  /* ─────────── PRODUÇÃO ─────────── */
  producao_etapas: {
    modulo: "Produção",
    tabela: "producao_etapas",
    sql: `
CREATE TABLE IF NOT EXISTS producao_etapas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL,
  ordem_producao   text NOT NULL,
  descricao_etapa  text NOT NULL,
  responsavel      text,
  data_inicio      date,
  data_fim         date,
  status           text DEFAULT 'Pendente',
  observacoes      text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX ON producao_etapas (empresa_id);
`.trim(),
  },

  /* ─────────── LOGÍSTICA ─────────── */
  expedicoes: {
    modulo: "Logística",
    tabela: "expedicoes",
    sql: `
CREATE TABLE IF NOT EXISTS expedicoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            uuid NOT NULL,
  numero_expedicao      text,
  pedido_ref            text,
  cliente_nome          text NOT NULL,
  transportadora        text,
  data_expedicao        date,
  data_entrega_prevista date,
  status                text DEFAULT 'Aguardando',
  observacoes           text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
CREATE INDEX ON expedicoes (empresa_id);
`.trim(),
  },

  /* ─────────── QUALIDADE ─────────── */
  controle_qualidade: {
    modulo: "Qualidade",
    tabela: "controle_qualidade",
    sql: `
CREATE TABLE IF NOT EXISTS controle_qualidade (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL,
  produto_lote    text NOT NULL,
  ordem_producao  text,
  responsavel     text,
  data_inspecao   date,
  resultado       text DEFAULT 'Em análise',
  observacoes     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX ON controle_qualidade (empresa_id);
`.trim(),
  },

  /* ─────────── EMBALAGEM ─────────── */
  embalagens: {
    modulo: "Embalagem",
    tabela: "embalagens",
    sql: `
CREATE TABLE IF NOT EXISTS embalagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL,
  codigo          text,
  descricao       text NOT NULL,
  tipo            text,
  fornecedor      text,
  estoque_atual   numeric(10,3) DEFAULT 0,
  estoque_minimo  numeric(10,3) DEFAULT 0,
  status          text DEFAULT 'Ativo',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX ON embalagens (empresa_id);
`.trim(),
  },

  /* ─────────── CONFIGURAÇÕES ERP ─────────── */
  configuracoes_erp: {
    modulo: "Administração",
    tabela: "configuracoes_erp",
    sql: `
CREATE TABLE IF NOT EXISTS configuracoes_erp (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL,
  nome_config  text NOT NULL,
  valor_config text NOT NULL,
  descricao    text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX ON configuracoes_erp (empresa_id);
`.trim(),
  },

  integracoes_erp: {
    modulo: "Administração",
    tabela: "integracoes_erp",
    sql: `
CREATE TABLE IF NOT EXISTS integracoes_erp (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            uuid NOT NULL,
  nome_app              text NOT NULL,
  descricao             text,
  webhook_url           text,
  secret_token          text,
  status                text DEFAULT 'Ativo',
  ultima_sincronizacao  timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
CREATE INDEX ON integracoes_erp (empresa_id);
`.trim(),
  },

  logs_auditoria: {
    modulo: "Administração",
    tabela: "logs_auditoria",
    sql: `
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL,
  evento         text NOT NULL,
  modulo         text,
  usuario_email  text,
  descricao      text,
  dados_extras   text,
  status         text DEFAULT 'Sucesso',
  ip_origem      text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX ON logs_auditoria (empresa_id);
CREATE INDEX ON logs_auditoria (created_at DESC);
`.trim(),
  },

  perfis_acesso: {
    modulo: "Administração",
    tabela: "perfis_acesso",
    sql: `
CREATE TABLE IF NOT EXISTS perfis_acesso (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL,
  nome_perfil  text NOT NULL,
  descricao    text,
  status       text DEFAULT 'Ativo',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX ON perfis_acesso (empresa_id);
`.trim(),
  },

  modulos_erp: {
    modulo: "Administração",
    tabela: "modulos_erp",
    sql: `
CREATE TABLE IF NOT EXISTS modulos_erp (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL,
  nome_modulo  text NOT NULL,
  status       text DEFAULT 'Preparado',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX ON modulos_erp (empresa_id);
`.trim(),
  },

  erp_usuarios: {
    modulo: "Administração",
    tabela: "erp_usuarios",
    sql: `
CREATE TABLE IF NOT EXISTS erp_usuarios (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           uuid NOT NULL,
  nome                 text NOT NULL,
  email                text NOT NULL,
  perfil               text DEFAULT 'usuario',
  modulo_origem        text,
  modulos_autorizados  text[],
  status               text DEFAULT 'Ativo',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
CREATE INDEX ON erp_usuarios (empresa_id);
`.trim(),
  },
};

/**
 * Retorna o SQL completo para criar todas as tabelas do ERP.
 * Execute no Supabase → SQL Editor → New Query
 */
export function getAllSql() {
  return Object.values(DATABASE_SCHEMA)
    .map(t => `-- ${t.modulo} › ${t.tabela}\n${t.sql}`)
    .join("\n\n");
}

/**
 * Retorna as tabelas agrupadas por módulo.
 */
export function getSchemaByModulo() {
  const grouped = {};
  Object.values(DATABASE_SCHEMA).forEach(t => {
    if (!grouped[t.modulo]) grouped[t.modulo] = [];
    grouped[t.modulo].push(t);
  });
  return grouped;
}