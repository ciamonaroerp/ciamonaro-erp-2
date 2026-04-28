-- Criação da tabela historico_precos_produto_erp
CREATE TABLE IF NOT EXISTS public.historico_precos_produto_erp (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date timestamptz DEFAULT now() NOT NULL,
    updated_date timestamptz DEFAULT now() NOT NULL,
    created_by text,
    empresa_id uuid NOT NULL,
    codigo_unico text,
    codigo_produto text,
    descricao_original text,
    fornecedor_nome text,
    chave_danfe text NOT NULL,
    numero_nf text,
    numero_item integer,
    data_emissao timestamptz,
    valor_unitario numeric NOT NULL,
    quantidade numeric,
    valor_total numeric,
    unidade text,
    dados_danfe jsonb,
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_historico_erp_empresa_id ON public.historico_precos_produto_erp (empresa_id);
CREATE INDEX IF NOT EXISTS idx_historico_erp_codigo_unico ON public.historico_precos_produto_erp (codigo_unico);
CREATE INDEX IF NOT EXISTS idx_historico_erp_chave_danfe ON public.historico_precos_produto_erp (chave_danfe);
CREATE INDEX IF NOT EXISTS idx_historico_erp_data_emissao ON public.historico_precos_produto_erp (data_emissao DESC);

-- Conceder permissões (sem RLS, usando GRANT)
GRANT SELECT, INSERT ON public.historico_precos_produto_erp TO authenticated;

-- Trigger para atualizar updated_date
CREATE OR REPLACE FUNCTION public.update_historico_erp_updated_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_historico_erp_updated_date ON public.historico_precos_produto_erp;
CREATE TRIGGER set_historico_erp_updated_date
BEFORE UPDATE ON public.historico_precos_produto_erp
FOR EACH ROW
EXECUTE FUNCTION public.update_historico_erp_updated_date();