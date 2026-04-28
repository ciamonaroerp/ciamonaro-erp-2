# Auditoria de Hard Deletes - CRÍTICO

**Data:** 2026-04-08  
**Status:** Em auditoria

## Objetivo
Garantir que NENHUMA função faz hard delete (DELETE FROM).
Todos os deletes devem usar soft delete (UPDATE deleted_at).

## ✅ Corrigidas

### 1. `sincronizarTabelaPrecos` ✅
- Removida lógica de DELETE ao limpar duplicatas
- Alterada para apenas marcar como inativo

### 2. `produtoComercialCRUD` ✅
- `save_produto_composicao`: substituído DELETE → UPDATE deleted_at
- `save_produto_composicao_multi`: substituído DELETE → UPDATE deleted_at (2 lugares)

## 🔍 Checklist de Auditoria

- [ ] Procurar todos os `.delete()` no codebase
- [ ] Verificar cada uma:
  - `functions/*/delete*`
  - `functions/*CRUD*`
  - Qualquer chamada Supabase `.delete()`
- [ ] Converter para soft delete se necessário
- [ ] Documentar nas funções: `// SOFT DELETE ONLY`

### Comando de busca

```bash
grep -r "\.delete()" functions/ | grep -v ".deleteField"
grep -r "DELETE FROM" functions/
grep -r ".delete(" src/
```

## Funções a Verificar

- [ ] `functions/*/delete*` (todos os arquivos)
- [ ] `ProdutoComercialPage` (deleteArtigo, deleteProduto)
- [ ] `CustoProdutoPage` (se houver)
- [ ] Qualquer component com "delete" no nome
- [ ] `sincronizarTabelaPrecos` → ✅ corrigida
- [ ] `produtoComercialCRUD` → ✅ corrigida

## Padrão Correto

```javascript
// ❌ PROIBIDO
await supabase.from('tabela').delete().eq('id', id);

// ✅ OBRIGATÓRIO
await supabase
  .from('tabela')
  .update({ 
    deleted_at: new Date().toISOString(),
    deleted_by: user.email
  })
  .eq('id', id);
```

## Recovery

Se precisar restaurar um registro:
```javascript
await supabase
  .from('tabela')
  .update({ deleted_at: null, deleted_by: null })
  .eq('id', id);
```

---
**Próximo passo:** Procurar TODOS os `.delete()` e converter para soft delete.