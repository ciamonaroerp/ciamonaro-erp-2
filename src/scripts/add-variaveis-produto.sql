-- Adiciona coluna num_variaveis à tabela produto_comercial
ALTER TABLE produto_comercial
ADD COLUMN IF NOT EXISTS num_variaveis INTEGER DEFAULT 1;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_produto_comercial_num_variaveis 
ON produto_comercial(num_variaveis);