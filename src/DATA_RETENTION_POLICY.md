# Política Absoluta de Retenção de Dados

## 🚫 REGRA CRÍTICA

**NUNCA fazer hard delete (DELETE FROM) em nenhuma tabela.**

Todos os dados devem ser preservados permanentemente usando soft delete.

## ✅ Soft Delete - OBRIGATÓRIO

Ao invés de deletar, sempre:
1. Marcar `deleted_at = NOW()` 
2. Registrar `deleted_by = user.email`
3. Manter o registro intacto na tabela

### Exemplo

```javascript
// ❌ PROIBIDO
await supabase.from('tabela').delete().eq('id', id);

// ✅ CORRETO
await softDelete({
  table: 'tabela',
  id: id,
  empresa_id: empresa_id
});
```

## Tabelas com `deleted_at`

Todas as tabelas críticas devem ter:
```sql
ALTER TABLE tabela ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE tabela ADD COLUMN deleted_by TEXT NULL;
```

## RLS - Filtrar deletados

```sql
-- Sempre excluir soft-deleted em SELECT
.is('deleted_at', null)
```

## Auditoria

Ao deletar (soft delete), registrar em `LogsAuditoria`:
- `acao: 'deletar'`
- `dados_anteriores: {registro completo}`
- `usuario_email: user.email`

## Funções que DEVEM usar soft delete

- `deleteArtigo()`
- `deleteProduto()`
- `deleteCliente()`
- Todas operações de DELETE

## Recuperação

Se necessário recuperar um registro deletado:
```javascript
// Atualizar deleted_at para NULL
await supabase
  .from('tabela')
  .update({ deleted_at: null, deleted_by: null })
  .eq('id', id)
  .eq('empresa_id', empresa_id);
```

---
**Última atualização:** 2026-04-08  
**Responsável:** Arquitetura ERP