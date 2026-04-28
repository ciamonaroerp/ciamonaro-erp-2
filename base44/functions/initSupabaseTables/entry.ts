import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: "Supabase credentials not configured" }, { status: 500 });
    }

    // Create tables SQL
    const tablesSql = `
      -- Tabela: erp_usuarios
      CREATE TABLE IF NOT EXISTS erp_usuarios (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        perfil TEXT CHECK (perfil IN ('Administrador', 'Comercial', 'PPCP', 'Logística', 'Financeiro', 'Compras', 'Estoque')) NOT NULL,
        status TEXT CHECK (status IN ('Pendente', 'Ativo', 'Inativo')) DEFAULT 'Pendente',
        modulo_origem TEXT,
        modulos_autorizados TEXT[] DEFAULT ARRAY[]::TEXT[],
        empresa_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: perfis_acesso
      CREATE TABLE IF NOT EXISTS perfis_acesso (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome_perfil TEXT NOT NULL,
        descricao TEXT,
        status TEXT CHECK (status IN ('Ativo', 'Inativo')) DEFAULT 'Ativo',
        empresa_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: clientes
      CREATE TABLE IF NOT EXISTS clientes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome_cliente TEXT NOT NULL,
        documento TEXT UNIQUE NOT NULL,
        cidade TEXT,
        estado TEXT,
        telefone TEXT,
        email TEXT,
        status TEXT CHECK (status IN ('Ativo', 'Inativo')) DEFAULT 'Ativo',
        empresa_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: produtos
      CREATE TABLE IF NOT EXISTS produtos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        descricao TEXT NOT NULL,
        categoria TEXT,
        tipo_produto TEXT CHECK (tipo_produto IN ('Matéria Prima', 'Produto Acabado', 'Insumo', 'Embalagem')) NOT NULL,
        status TEXT CHECK (status IN ('Ativo', 'Inativo')) DEFAULT 'Ativo',
        empresa_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: modulos_erp
      CREATE TABLE IF NOT EXISTS modulos_erp (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome_modulo TEXT NOT NULL,
        status TEXT CHECK (status IN ('Ativo', 'Preparado', 'Inativo')) DEFAULT 'Preparado',
        empresa_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: configuracoes_erp
      CREATE TABLE IF NOT EXISTS configuracoes_erp (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome_config TEXT NOT NULL,
        valor_config TEXT NOT NULL,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: integracoes_erp
      CREATE TABLE IF NOT EXISTS integracoes_erp (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome_app TEXT NOT NULL,
        descricao TEXT,
        webhook_url TEXT,
        secret_token TEXT,
        status TEXT CHECK (status IN ('Ativo', 'Inativo')) DEFAULT 'Ativo',
        ultima_sincronizacao TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: logs_auditoria
      CREATE TABLE IF NOT EXISTS logs_auditoria (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        evento TEXT NOT NULL,
        modulo TEXT NOT NULL,
        usuario_email TEXT,
        descricao TEXT,
        dados_extras TEXT,
        status TEXT CHECK (status IN ('Sucesso', 'Erro', 'Aviso')) DEFAULT 'Sucesso',
        ip_origem TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: solicitacaoppcp
      CREATE TABLE IF NOT EXISTS solicitacaoppcp (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        numero_solicitacao TEXT UNIQUE NOT NULL,
        status TEXT CHECK (status IN ('Enviado ao PPCP', 'Em análise', 'Ajustes', 'Aprovado', 'Reprovado')) DEFAULT 'Enviado ao PPCP',
        vendedor_email TEXT NOT NULL,
        cliente_nome TEXT,
        artigo TEXT NOT NULL,
        cor TEXT NOT NULL,
        modelo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        tipo_personalizacao TEXT,
        mangas_personalizadas TEXT,
        num_cores_silkscreen INTEGER,
        num_posicoes_silkscreen INTEGER,
        data_entrega_cliente DATE NOT NULL,
        observacoes_vendedor TEXT,
        validade_aprovacao TEXT,
        data_aprovacao TIMESTAMP,
        tempo_resposta_ppcp INTEGER,
        alerta_sla TEXT CHECK (alerta_sla IN ('normal', 'alerta', 'crítico')) DEFAULT 'normal',
        empresa_id TEXT,
        data_arquivamento TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: solicitacaofrete
      CREATE TABLE IF NOT EXISTS solicitacaofrete (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        numero_solicitacao TEXT UNIQUE NOT NULL,
        status TEXT CHECK (status IN ('Enviado à logística', 'Em análise', 'Ajustes', 'Concluído')) DEFAULT 'Enviado à logística',
        vendedor_email TEXT NOT NULL,
        cliente_nome TEXT NOT NULL,
        cep_destino TEXT NOT NULL,
        data_entrega DATE NOT NULL,
        quantidade_camisetas INTEGER NOT NULL,
        valor_mercadoria DECIMAL(10, 2) NOT NULL,
        observacoes_vendedor TEXT,
        tempo_resposta_logistica INTEGER,
        alerta_sla TEXT CHECK (alerta_sla IN ('normal', 'alerta', 'crítico')) DEFAULT 'normal',
        empresa_id TEXT,
        data_arquivamento TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: chatcomercial
      CREATE TABLE IF NOT EXISTS chatcomercial (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        solicitacao_id TEXT NOT NULL,
        tipo_solicitacao TEXT CHECK (tipo_solicitacao IN ('PPCP', 'Frete')) NOT NULL,
        usuario_email TEXT NOT NULL,
        usuario_nome TEXT,
        mensagem TEXT NOT NULL,
        empresa_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: notificacaoppcp
      CREATE TABLE IF NOT EXISTS notificacaoppcp (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        usuario_email TEXT NOT NULL,
        tipo TEXT CHECK (tipo IN ('nova_solicitacao', 'nova_mensagem', 'alteracao_status', 'aprovacao_vencida')) NOT NULL,
        solicitacao_id TEXT,
        titulo TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        lida BOOLEAN DEFAULT FALSE,
        data_leitura TIMESTAMP,
        empresa_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: cotacoes_frete
      CREATE TABLE IF NOT EXISTS cotacoes_frete (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        solicitacao_frete_id TEXT NOT NULL,
        numero_cotacao_sistema TEXT UNIQUE NOT NULL,
        numero_cotacao_transportadora TEXT NOT NULL,
        transportadora TEXT NOT NULL,
        modalidade TEXT CHECK (modalidade IN ('Rodoviário', 'Aéreo', 'Marítimo')) NOT NULL,
        prazo_entrega INTEGER,
        valor DECIMAL(10, 2) NOT NULL,
        quantidade_volumes INTEGER,
        peso_total DECIMAL(10, 2),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela: transportadoras
      CREATE TABLE IF NOT EXISTS transportadoras (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        contato TEXT,
        telefone TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_erp_usuarios_empresa ON erp_usuarios(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_perfis_acesso_empresa ON perfis_acesso(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_modulos_erp_empresa ON modulos_erp(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_solicitacaoppcp_empresa ON solicitacaoppcp(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_solicitacaofrete_empresa ON solicitacaofrete(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_solicitacao ON cotacoes_frete(solicitacao_frete_id);
      CREATE INDEX IF NOT EXISTS idx_chatcomercial_solicitacao ON chatcomercial(solicitacao_id);
    `;

    console.log("⚠️ Note: Run these SQL commands in your Supabase dashboard > SQL Editor:");
    console.log(tablesSql);

    return Response.json({
      success: true,
      message: "SQL migrations generated. Execute them in Supabase dashboard > SQL Editor.",
      sql: tablesSql
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});