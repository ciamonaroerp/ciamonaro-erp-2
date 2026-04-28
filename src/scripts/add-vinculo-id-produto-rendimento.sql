-- Adiciona coluna vinculo_id à tabela produto_rendimento_valores
ALTER TABLE produto_rendimento_valores 
ADD COLUMN IF NOT EXISTS vinculo_id UUID;

-- Cria índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_produto_rendimento_valores_vinculo_id 
ON produto_rendimento_valores(vinculo_id);

-- Verifica se a coluna foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produto_rendimento_valores' 
ORDER BY ordinal_position;