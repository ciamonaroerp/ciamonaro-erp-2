import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const sql = `
-- ============================================================
-- CIAMONARO ERP — MIGRATION v2.0
-- PostgreSQL (Supabase) | SaaS Multiempresa + RLS
-- Gerado em: ${new Date().toISOString()}
-- Execute no SQL Editor do Supabase
-- ============================================================

-- EXTENSÕES
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. empresas (tabela raiz — sem empresa_id)
-- ============================================================
create table if not exists empresas (
  id            uuid primary key default gen_random_uuid(),
  razao_social  text not null,
  nome_fantasia text,
  cnpj          text not null unique,
  email         text,
  telefone      text,
  endereco      text,
  numero        text,
  bairro        text,
  cidade        text,
  estado        text,
  cep           text,
  status        text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at    timestamptz default now(),
  updated_at    timestamptz
);

-- ============================================================
-- 2. erp_usuarios
-- ============================================================
create table if not exists erp_usuarios (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  nome                  text not null,
  email                 text not null,
  perfil                text not null check (perfil in ('Administrador','Usuário')),
  status                text not null default 'Pendente' check (status in ('Pendente','Ativo','Inativo')),
  modulos_autorizados   jsonb default '[]',
  cadastros_autorizados jsonb default '[]',
  sistema_autorizado    jsonb default '[]',
  modulo_origem         text,
  created_at            timestamptz default now(),
  updated_at            timestamptz,
  unique(empresa_id, email)
);
create index if not exists idx_erp_usuarios_empresa_id on erp_usuarios(empresa_id);
create index if not exists idx_erp_usuarios_email      on erp_usuarios(email);

-- ============================================================
-- 3. clientes
-- ============================================================
create table if not exists clientes (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas(id) on delete cascade,
  codigo             text,
  nome_cliente       text not null,
  nome_fantasia      text,
  documento          text not null,
  tipo_pessoa        text default 'PJ' check (tipo_pessoa in ('PF','PJ')),
  inscricao_estadual text,
  situacao_ie        text default 'Não Contribuinte',
  email              text,
  telefone           text,
  celular            text,
  site               text,
  endereco           text,
  numero             text,
  complemento        text,
  bairro             text,
  cidade             text,
  estado             text,
  cep                text,
  limite_credito     numeric(15,2) default 0,
  condicao_pagamento text,
  observacoes        text,
  status             text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  created_at         timestamptz default now(),
  updated_at         timestamptz
);
create index if not exists idx_clientes_empresa_id on clientes(empresa_id);
create index if not exists idx_clientes_documento  on clientes(documento);
create index if not exists idx_clientes_nome       on clientes(nome_cliente);

-- ============================================================
-- 4. fornecedores
-- ============================================================
create table if not exists fornecedores (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  codigo          text,
  nome_fornecedor text not null,
  nome_fantasia   text,
  documento       text not null,
  tipo_pessoa     text default 'PJ' check (tipo_pessoa in ('PF','PJ')),
  inscricao_estadual text,
  email           text,
  telefone        text,
  celular         text,
  endereco        text,
  numero          text,
  bairro          text,
  cidade          text,
  estado          text,
  cep             text,
  condicao_pagamento text,
  observacoes     text,
  status          text not null default 'ativo' check (status in ('ativo','inativo','bloqueado')),
  created_at      timestamptz default now(),
  updated_at      timestamptz
);
create index if not exists idx_fornecedores_empresa_id on fornecedores(empresa_id);
create index if not exists idx_fornecedores_documento  on fornecedores(documento);

-- ============================================================
-- 5. produtos
-- ============================================================
create table if not exists produtos (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references empresas(id) on delete cascade,
  codigo                 text,
  descricao              text not null,
  descricao_complementar text,
  categoria              text,
  tipo_produto           text not null check (tipo_produto in ('Matéria Prima','Produto Acabado','Insumo','Embalagem')),
  unidade_medida         text default 'UN',
  preco_custo            numeric(15,4) default 0,
  preco_venda            numeric(15,4) default 0,
  peso_liquido           numeric(10,4),
  peso_bruto             numeric(10,4),
  status                 text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  created_at             timestamptz default now(),
  updated_at             timestamptz
);
create index if not exists idx_produtos_empresa_id on produtos(empresa_id);
create index if not exists idx_produtos_codigo     on produtos(codigo);

-- ============================================================
-- 6. materias_primas
-- ============================================================
create table if not exists materias_primas (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  codigo            text,
  descricao         text not null,
  unidade_medida    text not null default 'KG',
  estoque_atual     numeric(15,4) default 0,
  estoque_minimo    numeric(15,4) default 0,
  estoque_maximo    numeric(15,4),
  preco_custo_medio numeric(15,4) default 0,
  fornecedor_id     uuid references fornecedores(id),
  localizacao       text,
  status            text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  created_at        timestamptz default now(),
  updated_at        timestamptz
);
create index if not exists idx_materias_primas_empresa_id on materias_primas(empresa_id);
create index if not exists idx_materias_primas_codigo     on materias_primas(codigo);
create index if not exists idx_materias_primas_fornecedor on materias_primas(fornecedor_id);

-- ============================================================
-- 7. transportadoras
-- ============================================================
create table if not exists transportadoras (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id) on delete cascade,
  nome_transportadora text not null,
  nome_fantasia       text,
  cnpj                text not null,
  inscricao_estadual  text,
  situacao_ie         text default 'Não Contribuinte',
  email               text,
  telefone            text,
  endereco            text,
  numero              text,
  bairro              text,
  cidade              text,
  estado              text,
  cep                 text,
  observacoes         text,
  status              text not null default 'ativo' check (status in ('ativo','bloqueado')),
  created_at          timestamptz default now(),
  updated_at          timestamptz
);
create index if not exists idx_transportadoras_empresa_id on transportadoras(empresa_id);

-- ============================================================
-- 8. modalidade_frete
-- ============================================================
create table if not exists modalidade_frete (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  nome_modalidade text not null,
  descricao       text,
  status          text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  created_at      timestamptz default now(),
  updated_at      timestamptz
);
create index if not exists idx_modalidade_frete_empresa_id on modalidade_frete(empresa_id);

-- ============================================================
-- 9. pedidos
-- ============================================================
create table if not exists pedidos (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references empresas(id) on delete cascade,
  numero_pedido          text not null,
  cliente_id             uuid not null references clientes(id),
  vendedor_id            uuid references erp_usuarios(id),
  transportadora_id      uuid references transportadoras(id),
  modalidade_frete_id    uuid references modalidade_frete(id),
  data_pedido            date not null default current_date,
  data_entrega_prevista  date,
  data_entrega_realizada date,
  status                 text not null default 'Rascunho'
    check (status in ('Rascunho','Confirmado','Em Produção','Pronto','Entregue','Cancelado')),
  valor_subtotal         numeric(15,2) default 0,
  valor_desconto         numeric(15,2) default 0,
  valor_frete            numeric(15,2) default 0,
  valor_total            numeric(15,2) default 0,
  observacoes            text,
  created_at             timestamptz default now(),
  updated_at             timestamptz,
  unique(empresa_id, numero_pedido)
);
create index if not exists idx_pedidos_empresa_id  on pedidos(empresa_id);
create index if not exists idx_pedidos_numero      on pedidos(numero_pedido);
create index if not exists idx_pedidos_cliente_id  on pedidos(cliente_id);
create index if not exists idx_pedidos_status      on pedidos(status);
create index if not exists idx_pedidos_vendedor_id on pedidos(vendedor_id);

-- ============================================================
-- 10. pedidos_itens
-- ============================================================
create table if not exists pedidos_itens (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  pedido_id      uuid not null references pedidos(id) on delete cascade,
  produto_id     uuid not null references produtos(id),
  sequencia      integer,
  quantidade     numeric(15,4) not null,
  preco_unitario numeric(15,4) not null,
  valor_desconto numeric(15,4) default 0,
  valor_total    numeric(15,4) generated always as (quantidade * preco_unitario - valor_desconto) stored,
  observacoes    text,
  created_at     timestamptz default now()
);
create index if not exists idx_pedidos_itens_empresa_id on pedidos_itens(empresa_id);
create index if not exists idx_pedidos_itens_pedido_id  on pedidos_itens(pedido_id);
create index if not exists idx_pedidos_itens_produto_id on pedidos_itens(produto_id);

-- ============================================================
-- 11. contas_receber
-- ============================================================
create table if not exists contas_receber (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas(id) on delete cascade,
  numero_documento text,
  cliente_id       uuid not null references clientes(id),
  pedido_id        uuid references pedidos(id),
  descricao        text,
  valor            numeric(15,2) not null,
  data_emissao     date not null default current_date,
  data_vencimento  date not null,
  data_pagamento   date,
  valor_pago       numeric(15,2),
  status           text not null default 'Aberto'
    check (status in ('Aberto','Pago','Vencido','Cancelado','Negociado')),
  forma_pagamento  text,
  observacoes      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz
);
create index if not exists idx_contas_receber_empresa_id on contas_receber(empresa_id);
create index if not exists idx_contas_receber_cliente_id on contas_receber(cliente_id);
create index if not exists idx_contas_receber_pedido_id  on contas_receber(pedido_id);
create index if not exists idx_contas_receber_vencimento on contas_receber(data_vencimento);
create index if not exists idx_contas_receber_status     on contas_receber(status);

-- ============================================================
-- 12. contas_pagar
-- ============================================================
create table if not exists contas_pagar (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas(id) on delete cascade,
  numero_documento text,
  fornecedor_id    uuid not null references fornecedores(id),
  descricao        text,
  valor            numeric(15,2) not null,
  data_emissao     date not null default current_date,
  data_vencimento  date not null,
  data_pagamento   date,
  valor_pago       numeric(15,2),
  status           text not null default 'Aberto'
    check (status in ('Aberto','Pago','Vencido','Cancelado','Negociado')),
  forma_pagamento  text,
  observacoes      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz
);
create index if not exists idx_contas_pagar_empresa_id on contas_pagar(empresa_id);
create index if not exists idx_contas_pagar_fornecedor on contas_pagar(fornecedor_id);
create index if not exists idx_contas_pagar_vencimento on contas_pagar(data_vencimento);
create index if not exists idx_contas_pagar_status     on contas_pagar(status);

-- ============================================================
-- 13. ordens_producao
-- ============================================================
create table if not exists ordens_producao (
  id                   uuid primary key default gen_random_uuid(),
  empresa_id           uuid not null references empresas(id) on delete cascade,
  numero_ordem         text not null,
  pedido_id            uuid references pedidos(id),
  produto_id           uuid not null references produtos(id),
  quantidade           numeric(15,4) not null,
  data_inicio_prevista date,
  data_fim_prevista    date,
  data_inicio_real     date,
  data_fim_real        date,
  responsavel_id       uuid references erp_usuarios(id),
  status               text not null default 'Planejada'
    check (status in ('Planejada','Em Produção','Pausada','Concluída','Cancelada')),
  prioridade           text default 'Normal'
    check (prioridade in ('Baixa','Normal','Alta','Urgente')),
  observacoes          text,
  created_at           timestamptz default now(),
  updated_at           timestamptz,
  unique(empresa_id, numero_ordem)
);
create index if not exists idx_ordens_producao_empresa_id on ordens_producao(empresa_id);
create index if not exists idx_ordens_producao_numero     on ordens_producao(numero_ordem);
create index if not exists idx_ordens_producao_pedido_id  on ordens_producao(pedido_id);
create index if not exists idx_ordens_producao_produto_id on ordens_producao(produto_id);
create index if not exists idx_ordens_producao_status     on ordens_producao(status);

-- ============================================================
-- 14. producao_etapas
-- ============================================================
create table if not exists producao_etapas (
  id                   uuid primary key default gen_random_uuid(),
  empresa_id           uuid not null references empresas(id) on delete cascade,
  ordem_producao_id    uuid not null references ordens_producao(id) on delete cascade,
  nome_etapa           text not null,
  sequencia            integer not null,
  responsavel_id       uuid references erp_usuarios(id),
  data_inicio_prevista date,
  data_fim_prevista    date,
  data_inicio_real     timestamptz,
  data_fim_real        timestamptz,
  status               text not null default 'Pendente'
    check (status in ('Pendente','Em Andamento','Concluída','Bloqueada')),
  observacoes          text,
  created_at           timestamptz default now(),
  updated_at           timestamptz
);
create index if not exists idx_producao_etapas_empresa_id on producao_etapas(empresa_id);
create index if not exists idx_producao_etapas_ordem_id   on producao_etapas(ordem_producao_id);

-- ============================================================
-- 15. estoque_produtos
-- ============================================================
create table if not exists estoque_produtos (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  produto_id            uuid not null references produtos(id),
  quantidade_disponivel numeric(15,4) not null default 0,
  quantidade_reservada  numeric(15,4) not null default 0,
  quantidade_minima     numeric(15,4) default 0,
  quantidade_maxima     numeric(15,4),
  localizacao           text,
  created_at            timestamptz default now(),
  updated_at            timestamptz,
  unique(empresa_id, produto_id)
);
create index if not exists idx_estoque_produtos_empresa_id on estoque_produtos(empresa_id);
create index if not exists idx_estoque_produtos_produto_id on estoque_produtos(produto_id);

-- ============================================================
-- 16. estoque_materia_mov
-- ============================================================
create table if not exists estoque_materia_mov (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas(id) on delete cascade,
  materia_prima_id uuid not null references materias_primas(id),
  tipo_movimento   text not null
    check (tipo_movimento in ('Entrada','Saída','Ajuste','Transferência')),
  quantidade       numeric(15,4) not null,
  saldo_anterior   numeric(15,4) not null default 0,
  saldo_atual      numeric(15,4) not null default 0,
  motivo           text,
  ordem_producao_id uuid references ordens_producao(id),
  fornecedor_id    uuid references fornecedores(id),
  usuario_id       uuid references erp_usuarios(id),
  observacoes      text,
  created_at       timestamptz default now()
);
create index if not exists idx_estoque_materia_mov_empresa_id on estoque_materia_mov(empresa_id);
create index if not exists idx_estoque_materia_mov_materia_id on estoque_materia_mov(materia_prima_id);
create index if not exists idx_estoque_materia_mov_ordem_id   on estoque_materia_mov(ordem_producao_id);

-- ============================================================
-- 17. logs_auditoria
-- ============================================================
create table if not exists logs_auditoria (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid references empresas(id),
  usuario_id       uuid references erp_usuarios(id),
  usuario_email    text,
  acao             text not null,
  entidade         text not null,
  registro_id      text,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  ip_origem        text,
  modulo           text,
  created_at       timestamptz default now()
);
create index if not exists idx_logs_auditoria_empresa_id on logs_auditoria(empresa_id);
create index if not exists idx_logs_auditoria_usuario_id on logs_auditoria(usuario_id);
create index if not exists idx_logs_auditoria_entidade   on logs_auditoria(entidade);
create index if not exists idx_logs_auditoria_created_at on logs_auditoria(created_at desc);

-- ============================================================
-- 18. TABELAS AUXILIARES DO ERP
-- ============================================================
create table if not exists modulos_erp (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nome_modulo text not null,
  status      text not null default 'Preparado' check (status in ('Ativo','Preparado','Inativo')),
  created_at  timestamptz default now(),
  updated_at  timestamptz
);
create index if not exists idx_modulos_erp_empresa_id on modulos_erp(empresa_id);

create table if not exists configuracoes_erp (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  nome_config  text not null,
  valor_config text,
  descricao    text,
  created_at   timestamptz default now(),
  updated_at   timestamptz,
  unique(empresa_id, nome_config)
);
create index if not exists idx_configuracoes_erp_empresa_id on configuracoes_erp(empresa_id);

create table if not exists deploy_versions (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid references empresas(id),
  version       text not null,
  environment   text not null default 'development'
    check (environment in ('development','staging','production')),
  status        text not null default 'draft'
    check (status in ('draft','approved','deployed','rollback','failed')),
  date_deployed timestamptz,
  deployed_by   text,
  notes         text,
  build_log     text,
  target_path   text default '/public_html/erp',
  target_url    text default 'https://erp.ciamonaro.com.br',
  created_at    timestamptz default now(),
  updated_at    timestamptz
);

create table if not exists audit_logs (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid references empresas(id),
  usuario_email    text,
  acao             text not null,
  entidade         text not null,
  registro_id      text,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  modulo           text,
  data_evento      timestamptz default now(),
  created_at       timestamptz default now()
);
create index if not exists idx_audit_logs_empresa_id on audit_logs(empresa_id);
create index if not exists idx_audit_logs_entidade   on audit_logs(entidade);

-- ============================================================
-- 19. SOLICITAÇÕES COMERCIAIS
-- ============================================================
create table if not exists solicitacao_ppcp (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid references empresas(id),
  numero_solicitacao     text not null,
  status                 text not null default 'Enviado ao PPCP'
    check (status in ('Enviado ao PPCP','Em análise','Ajustes','Aprovado','Reprovado')),
  vendedor_email         text not null,
  cliente_id             uuid references clientes(id),
  artigo                 text not null,
  cor                    text not null,
  modelo                 text not null,
  quantidade             numeric not null,
  tipo_personalizacao    text,
  data_entrega_cliente   date not null,
  observacoes_vendedor   text,
  validade_aprovacao     text,
  data_aprovacao         timestamptz,
  alerta_sla             text default 'normal' check (alerta_sla in ('normal','alerta','crítico')),
  created_at             timestamptz default now(),
  updated_at             timestamptz
);
create index if not exists idx_solicitacao_ppcp_empresa_id on solicitacao_ppcp(empresa_id);
create index if not exists idx_solicitacao_ppcp_numero     on solicitacao_ppcp(numero_solicitacao);
create index if not exists idx_solicitacao_ppcp_status     on solicitacao_ppcp(status);

create table if not exists solicitacao_frete (
  id                      uuid primary key default gen_random_uuid(),
  empresa_id              uuid references empresas(id),
  numero_solicitacao      text not null,
  status                  text not null default 'Enviado à logística'
    check (status in ('Enviado à logística','Em análise','Ajustes','Concluído')),
  vendedor_email          text not null,
  cliente_id              uuid references clientes(id),
  cep_destino             text not null,
  data_entrega            date not null,
  quantidade_camisetas    numeric not null,
  valor_mercadoria        numeric not null,
  observacoes_vendedor    text,
  alerta_sla              text default 'normal' check (alerta_sla in ('normal','alerta','crítico')),
  created_at              timestamptz default now(),
  updated_at              timestamptz
);
create index if not exists idx_solicitacao_frete_empresa_id on solicitacao_frete(empresa_id);
create index if not exists idx_solicitacao_frete_numero     on solicitacao_frete(numero_solicitacao);

create table if not exists chat_comercial (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid references empresas(id),
  solicitacao_id   text not null,
  tipo_solicitacao text not null check (tipo_solicitacao in ('PPCP','Frete')),
  usuario_email    text not null,
  usuario_nome     text,
  mensagem         text not null,
  data_hora        timestamptz default now(),
  created_at       timestamptz default now()
);
create index if not exists idx_chat_comercial_empresa_id    on chat_comercial(empresa_id);
create index if not exists idx_chat_comercial_solicitacao   on chat_comercial(solicitacao_id);

-- ============================================================
-- 20. MÓDULO FISCAL
-- ============================================================
create table if not exists nota_fiscal_importada (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  chave_nfe             text not null,
  numero_nf             text,
  serie                 text,
  data_emissao          text,
  data_entrada_saida    text,
  valor_total_nf        numeric(15,2),
  emitente_cnpj         text,
  emitente_nome         text,
  emitente_endereco     text,
  destinatario_documento text,
  destinatario_nome     text,
  destinatario_endereco text,
  itens                 jsonb,
  duplicatas            jsonb,
  impostos              jsonb,
  status                text not null default 'Importada' check (status in ('Importada','Cancelada')),
  created_at            timestamptz default now(),
  updated_at            timestamptz,
  unique(empresa_id, chave_nfe)
);
create index if not exists idx_nota_fiscal_importada_empresa_id on nota_fiscal_importada(empresa_id);
create index if not exists idx_nota_fiscal_importada_chave_nfe  on nota_fiscal_importada(chave_nfe);

-- ============================================================
-- 21. ENGENHARIA DE PRODUTO
-- ============================================================
create table if not exists vinculo_cadastro (
  id                            uuid primary key default gen_random_uuid(),
  empresa_id                    uuid not null references empresas(id) on delete cascade,
  fornecedor_nome               text not null,
  fornecedor_cnpj               text,
  codigo_produto_fornecedor     text not null,
  descricao_produto_fornecedor  text,
  artigo                        text not null,
  cor                           text not null,
  status                        text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  created_at                    timestamptz default now(),
  updated_at                    timestamptz,
  unique(empresa_id, codigo_produto_fornecedor, artigo, cor)
);
create index if not exists idx_vinculo_cadastro_empresa_id              on vinculo_cadastro(empresa_id);
create index if not exists idx_vinculo_cadastro_fornecedor_nome         on vinculo_cadastro(fornecedor_nome);
create index if not exists idx_vinculo_cadastro_codigo_produto_fornecedor on vinculo_cadastro(codigo_produto_fornecedor);

create table if not exists produto_comercial (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  nome_produto text not null,
  descricao    text,
  status       text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  created_at   timestamptz default now(),
  updated_at   timestamptz,
  unique(empresa_id, nome_produto)
);
create index if not exists idx_produto_comercial_empresa_id  on produto_comercial(empresa_id);
create index if not exists idx_produto_comercial_nome_produto on produto_comercial(nome_produto);

create table if not exists produto_comercial_artigo (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  produto_id uuid not null references produto_comercial(id) on delete cascade,
  artigo     text not null,
  created_at timestamptz default now(),
  updated_at timestamptz,
  unique(empresa_id, produto_id, artigo)
);
create index if not exists idx_produto_comercial_artigo_empresa_id on produto_comercial_artigo(empresa_id);
create index if not exists idx_produto_comercial_artigo_produto_id on produto_comercial_artigo(produto_id);

-- ============================================================
-- 22. TRIGGER: updated_at automático
-- ============================================================
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare t text;
begin
  foreach t in array array[
    'empresas','erp_usuarios','clientes','fornecedores','produtos','materias_primas',
    'transportadoras','modalidade_frete','pedidos','contas_receber','contas_pagar',
    'ordens_producao','producao_etapas','estoque_produtos','modulos_erp',
    'configuracoes_erp','deploy_versions','solicitacao_ppcp','solicitacao_frete',
    'nota_fiscal_importada','vinculo_cadastro','produto_comercial','produto_comercial_artigo'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at_%s on %s; create trigger set_updated_at_%s before update on %s for each row execute function update_updated_at_column()',
      t, t, t, t
    );
  end loop;
end $$;

-- ============================================================
-- 21. ROW LEVEL SECURITY (RLS)
-- ============================================================
do $$ declare t text;
begin
  foreach t in array array[
    'erp_usuarios','clientes','fornecedores','produtos','materias_primas',
    'transportadoras','modalidade_frete','pedidos','pedidos_itens',
    'contas_receber','contas_pagar','ordens_producao','producao_etapas',
    'estoque_produtos','estoque_materia_mov','logs_auditoria',
    'modulos_erp','configuracoes_erp','solicitacao_ppcp','solicitacao_frete','chat_comercial',
    'nota_fiscal_importada','vinculo_cadastro','produto_comercial','produto_comercial_artigo'
  ] loop
    execute format('alter table %s enable row level security', t);
    -- Remover policy existente se houver
    execute format('drop policy if exists "%s_empresa_isolation" on %s', t, t);
    -- Criar policy via service_role bypass + configuração por sessão
    execute format(
      'create policy "%s_empresa_isolation" on %s using (empresa_id = (current_setting(''app.empresa_id'', true))::uuid or (select current_setting(''app.bypass_rls'', true)) = ''true'')',
      t, t
    );
  end loop;
end $$;

-- ============================================================
-- GRANT: service_role tem acesso total (bypass RLS)
-- ============================================================
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================
-- FIM DA MIGRATION v2.0
-- ============================================================
`;

    return new Response(sql, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ciamonaro_erp_migration_v2.sql"',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});