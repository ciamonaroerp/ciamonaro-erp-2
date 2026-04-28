-- ============================================================================
-- SCRIPT SQL PARA CRIAR TABELAS - MÓDULO CONFIGURAÇÃO DO TECIDO
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. TABELA: config_tecido_cor
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.config_tecido_cor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nome_cor TEXT NOT NULL,
  descricao TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  
  CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
    REFERENCES public.empresas (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_config_tecido_cor_empresa_id 
  ON public.config_tecido_cor (empresa_id);

-- ============================================================================
-- 2. TABELA: config_tecido_artigo
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.config_tecido_artigo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nome_artigo TEXT NOT NULL,
  descricao TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  
  CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
    REFERENCES public.empresas (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_config_tecido_artigo_empresa_id 
  ON public.config_tecido_artigo (empresa_id);

-- ============================================================================
-- 3. TABELA: config_tecido_linha_comercial
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.config_tecido_linha_comercial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nome_linha_comercial TEXT NOT NULL,
  descricao TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  
  CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
    REFERENCES public.empresas (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_config_tecido_linha_comercial_empresa_id 
  ON public.config_tecido_linha_comercial (empresa_id);

-- ============================================================================
-- 4. TABELA: config_tecido_vinculos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.config_tecido_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  artigo_id UUID NOT NULL,
  cor_tecido_id UUID NOT NULL,
  linha_comercial_id UUID NOT NULL,
  codigo_unico TEXT NOT NULL UNIQUE,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  
  CONSTRAINT empresa_id_fkey FOREIGN KEY (empresa_id)
    REFERENCES public.empresas (id) ON DELETE CASCADE,
  
  CONSTRAINT artigo_id_fkey FOREIGN KEY (artigo_id)
    REFERENCES public.config_tecido_artigo (id) ON DELETE CASCADE,
  
  CONSTRAINT cor_tecido_id_fkey FOREIGN KEY (cor_tecido_id)
    REFERENCES public.config_tecido_cor (id) ON DELETE CASCADE,
  
  CONSTRAINT linha_comercial_id_fkey FOREIGN KEY (linha_comercial_id)
    REFERENCES public.config_tecido_linha_comercial (id) ON DELETE CASCADE,
  
  CONSTRAINT unique_vinculo UNIQUE (artigo_id, cor_tecido_id, linha_comercial_id)
);

CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_empresa_id 
  ON public.config_tecido_vinculos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_artigo_id 
  ON public.config_tecido_vinculos (artigo_id);

CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_cor_tecido_id 
  ON public.config_tecido_vinculos (cor_tecido_id);

CREATE INDEX IF NOT EXISTS idx_config_tecido_vinculos_linha_comercial_id 
  ON public.config_tecido_vinculos (linha_comercial_id);

-- ============================================================================
-- 5. DESABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.config_tecido_cor DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_tecido_artigo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_tecido_linha_comercial DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_tecido_vinculos DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CONCEDER PRIVILÉGIOS AO SERVICE_ROLE
-- ============================================================================
GRANT ALL PRIVILEGES ON TABLE public.config_tecido_cor TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.config_tecido_artigo TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.config_tecido_linha_comercial TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.config_tecido_vinculos TO service_role;

-- ============================================================================
-- 7. CONCEDER PRIVILÉGIOS EM SEQUENCES
-- ============================================================================
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- 8. CONCEDER USO DO SCHEMA
-- ============================================================================
GRANT USAGE ON SCHEMA public TO service_role;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================