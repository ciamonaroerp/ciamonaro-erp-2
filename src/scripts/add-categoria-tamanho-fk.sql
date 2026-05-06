-- Cria tabela CategoriasTamanho com categorias únicas de config_tamanhos
CREATE TABLE IF NOT EXISTS "CategoriasTamanho" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(empresa_id, nome)
);

-- Popula CategoriasTamanho com categorias únicas de config_tamanhos
INSERT INTO "CategoriasTamanho" (empresa_id, nome)
SELECT DISTINCT empresa_id, categoria 
FROM config_tamanhos
WHERE categoria IS NOT NULL
ON CONFLICT (empresa_id, nome) DO NOTHING;

-- Adiciona coluna categoria_tamanho_id em config_tamanhos
ALTER TABLE config_tamanhos
ADD COLUMN IF NOT EXISTS categoria_tamanho_id UUID REFERENCES "CategoriasTamanho"(id);

-- Popula categoria_tamanho_id baseado no match entre categoria (string) e CategoriasTamanho.nome
UPDATE config_tamanhos ct
SET categoria_tamanho_id = cat.id
FROM "CategoriasTamanho" cat
WHERE ct.categoria = cat.nome
  AND ct.empresa_id = cat.empresa_id
  AND ct.categoria_tamanho_id IS NULL;

-- Verifica dados inseridos
SELECT 
  ct.id,
  ct.tamanho_abreviado,
  ct.categoria,
  ct.categoria_tamanho_id,
  cat.nome as categoria_nome
FROM config_tamanhos ct
LEFT JOIN "CategoriasTamanho" cat ON ct.categoria_tamanho_id = cat.id
ORDER BY ct.empresa_id, ct.categoria, ct.tamanho_abreviado;