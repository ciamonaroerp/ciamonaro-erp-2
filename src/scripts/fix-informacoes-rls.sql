-- Desabilitar RLS na tabela informacoes_condicoes_comerciais
ALTER TABLE informacoes_condicoes_comerciais DISABLE ROW LEVEL SECURITY;

-- Alternativamente, criar política permissiva se quiser manter RLS ativo:
-- DROP POLICY IF EXISTS "allow_all" ON informacoes_condicoes_comerciais;
-- CREATE POLICY "allow_all" ON informacoes_condiciais_comerciais
-- FOR ALL USING (true) WITH CHECK (true);