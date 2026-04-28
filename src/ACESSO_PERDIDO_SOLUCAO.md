# ❌ ACESSO PERDIDO — SOLUÇÃO

## 🔍 PROBLEMA IDENTIFICADO

Você perdeu acesso a todos os módulos porque:

1. **Tabelas de Financiamento não existem no Supabase**
   - `fin_simulacoes_financiamento`
   - `fin_parcelas_simulacao`
   
2. **Erro 500 ao buscar permissões (erpUsuario)**
   - A tabela `erp_usuarios` pode ter problemas de RLS ou não existir

---

## ✅ SOLUÇÃO RÁPIDA (5 MINUTOS)

### Passo 1: Criar Tabelas de Financiamento

1. Acesse: **Supabase → SQL Editor**
2. Crie uma nova query
3. Cole o conteúdo de: `scripts/criar-tabelas-financiamento.sql`
4. Clique em "RUN"

**Resultado esperado:**
```
✅ Tabelas criadas com sucesso!
```

### Passo 2: Verificar Tabela erp_usuarios

Execute no SQL Editor:

```sql
SELECT COUNT(*) FROM erp_usuarios;
```

Se retornar erro `table does not exist`, execute:

```sql
-- Criar tabela erp_usuarios
CREATE TABLE IF NOT EXISTS erp_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255),
  perfil VARCHAR(100) DEFAULT 'Usuário',
  status VARCHAR(50) DEFAULT 'Ativo',
  modulos_autorizados TEXT[] DEFAULT '{}',
  cadastros_autorizados TEXT[] DEFAULT '{}',
  sistema_autorizado TEXT[] DEFAULT '{}',
  empresa_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS
ALTER TABLE erp_usuarios ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (MVP)
DROP POLICY IF EXISTS erp_usuarios_select ON erp_usuarios;
CREATE POLICY erp_usuarios_select ON erp_usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS erp_usuarios_insert ON erp_usuarios;
CREATE POLICY erp_usuarios_insert ON erp_usuarios FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS erp_usuarios_update ON erp_usuarios;
CREATE POLICY erp_usuarios_update ON erp_usuarios FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS erp_usuarios_delete ON erp_usuarios;
CREATE POLICY erp_usuarios_delete ON erp_usuarios FOR DELETE USING (true);

-- Índice
CREATE INDEX IF NOT EXISTS idx_erp_usuarios_email ON erp_usuarios(email);

-- Inserir seu usuário como admin
INSERT INTO erp_usuarios (
  email, 
  nome, 
  perfil, 
  status, 
  modulos_autorizados, 
  cadastros_autorizados, 
  sistema_autorizado
) VALUES (
  'seu_email@example.com',  -- SUBSTITUA COM SEU EMAIL!
  'Admin',
  'Administrador',
  'Ativo',
  ARRAY['Comercial', 'PPCP', 'Logística', 'Financeiro', 'Compras', 'Estoque MP', 'Estoque PA'],
  ARRAY['*'],
  ARRAY['*']
)
ON CONFLICT (email) DO NOTHING;
```

### Passo 3: Testar Acesso

1. Volte ao app (clique em "Refresh" no navegador)
2. Você deve ver todos os módulos novamente

---

## 🔧 VERIFICAÇÃO TÉCNICA

Após criar as tabelas, teste executando:

```sql
-- Verificar fin_simulacoes_financiamento
SELECT COUNT(*) as simulacoes FROM fin_simulacoes_financiamento;

-- Verificar fin_parcelas_simulacao
SELECT COUNT(*) as parcelas FROM fin_parcelas_simulacao;

-- Verificar erp_usuarios
SELECT COUNT(*) as usuarios FROM erp_usuarios;
```

Todos devem retornar um número (0 ou mais é OK).

---

## 📋 CHECKLIST

- [ ] Criei a tabela `fin_simulacoes_financiamento`
- [ ] Criei a tabela `fin_parcelas_simulacao`
- [ ] Criei a tabela `erp_usuarios` (se necessário)
- [ ] Inseri meu usuário em `erp_usuarios`
- [ ] Atualizei a página do app
- [ ] Vejo os módulos novamente

---

## 🚨 SE AINDA NÃO FUNCIONAR

1. **Limpe o cache do navegador:**
   - Pressione `Ctrl+Shift+Delete` (ou `Cmd+Shift+Delete` no Mac)
   - Selecione "Todos os tempos"
   - Clique "Limpar dados"

2. **Verificar logs:**
   - Abra o DevTools (F12)
   - Vá até "Console"
   - Procure por erros em vermelho
   - Screenshots dos erros ajudam no debug

3. **Contato:**
   - Se problema persistir, compartilhe:
     - Screenshot do erro no DevTools
     - Resultado do SQL: `SELECT * FROM erp_usuarios WHERE email = 'seu_email'`
     - Resultado do SQL: `SELECT COUNT(*) FROM fin_simulacoes_financiamento`

---

## 📞 PRÓXIMOS PASSOS

Depois de restaurar acesso:

1. ✅ Teste a **Calculadora de Financiamento** (Financeiro → Calculadora de Financiamento)
2. ✅ Crie uma simulação de teste
3. ✅ Valide que os dados aparecem corretamente

**Tudo pronto para usar o ERP!** 🎉