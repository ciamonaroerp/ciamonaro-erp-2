-- GRANT permissions para config_vinculos
-- Execute este script no Supabase SQL Editor para garantir acesso

GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Permissões completas para service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.config_vinculos TO service_role;

-- Permissões para authenticated (usuários normais)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.config_vinculos TO authenticated;

-- Sequências (se houver)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verificar se RLS está desativado (se aplicável)
ALTER TABLE public.config_vinculos DISABLE ROW LEVEL SECURITY;

-- Confirmar
SELECT 'GRANTs aplicados com sucesso para config_vinculos' as resultado;