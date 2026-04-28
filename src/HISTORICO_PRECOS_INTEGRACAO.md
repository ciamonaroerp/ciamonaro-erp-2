# Integração Invisível do Histórico de Preços

## ✅ Garantias Críticas

- ✅ ZERO impacto visual na ConfiguracaoTecidoPage
- ✅ ZERO alteração no fluxo de vínculo
- ✅ ZERO modificação de dados originais
- ✅ ZERO bloqueio de operações
- ✅ Totalmente isolado e desacoplado

## 📍 Ponto de Integração

O histórico deve ser registrado **INVISÍVEL** dentro do processo de importação XML, após buscar o vínculo e ANTES de atualizar estoque.

### Padrão de Integração

```javascript
// Em qualquer função que processa XML (importação, sincronização, etc):

import { useHistoricoPrecoIntegration } from '@/components/hooks/useHistoricoPrecoIntegration';

export function MeuComponenteDeImportacao() {
  const { registrarHistoricoParaItem } = useHistoricoPrecoIntegration();
  const { empresa_id } = useEmpresa();

  const processarXML = async (item) => {
    // 1. BUSCAR VÍNCULO (FLUXO ORIGINAL SEM ALTERAÇÃO)
    const vinculo = await buscarVinculoConfiguracaoTecido(item);

    // 2. REGISTRAR HISTÓRICO (NÃO BLOQUEIA)
    registrarHistoricoParaItem(item, vinculo, empresa_id);
    // ↑ Essa linha é invisível — não aguarda, não interfere

    // 3. CONTINUAR FLUXO NORMAL (SEM ALTERAÇÃO)
    if (vinculo) {
      await atualizarEstoque(vinculo, item);
    }
  };
}
```

## 🔧 Função do Hook

### `registrarHistoricoParaItem(item, vinculo, empresa_id)`

**Garantias:**
- NÃO awaita (não bloqueia)
- NÃO valida duplicidade (silencioso)
- NÃO altera item original
- NÃO altera vínculo
- NÃO gera erros ao usuário

**Parâmetros:**
- `item` — Object com dados do XML (xProd, qCom, vItem, vUnCom, etc)
- `vinculo` — Object com codigo_unico e codigo_produto (pode ser null)
- `empresa_id` — UUID da empresa

**Retorno:** `void` (nunca await)

## 📊 Estrutura Registrada

```javascript
{
  id: UUID,
  empresa_id: UUID,
  codigo_produto: String || null,        // Do vínculo
  codigo_unico: String || null,          // Do vínculo
  descricao_original: String,            // item.xProd
  fornecedor_nome: String || null,       // Do XML
  numero_nf: String || null,             // Do XML
  chave_danfe: String || null,           // Do XML
  data_emissao: Timestamp,               // Do XML
  valor_unitario: Number,                // item.vUnCom
  quantidade: Number,                    // item.qCom
  valor_total: Number,                   // item.vItem
  unidade: String || null,               // item.uCom
  criado_em: Timestamp                   // now()
}
```

## 🚫 PROIBIÇÕES ABSOLUTAS

- ❌ NÃO alterar ConfiguracaoTecidoPage
- ❌ NÃO modificar função processamento XML
- ❌ NÃO bloquear fluxo com validações
- ❌ NÃO gerar erros visíveis ao usuário
- ❌ NÃO usar histórico para bloquear/validar
- ❌ NÃO atualizar dados já persistidos
- ❌ NÃO deletar registros de histórico

## 📍 Acesso ao Histórico

Tela separada: `/HistoricoPrecosPage`

- Busca por código, descrição, NF, DANFE
- Exportação CSV
- Detalhes expandíveis
- Zero impacto no sistema principal

## 🔄 Exemplo Completo

```javascript
// No componente que importa XML
import { useHistoricoPrecoIntegration } from '@/components/hooks/useHistoricoPrecoIntegration';
import { useEmpresa } from '@/components/context/EmpresaContext';

function VincularProdutosTab() {
  const { empresa_id } = useEmpresa();
  const { registrarHistoricoParaItem } = useHistoricoPrecoIntegration();

  const procesarItemXML = async (item) => {
    try {
      // Busca vínculo conforme lógica original
      const vinculo = await buscarVinculoItem(item);

      // ← INTEGRAÇÃO INVISÍVEL AQUI
      registrarHistoricoParaItem(item, vinculo, empresa_id);

      // Continua fluxo original
      if (vinculo) {
        await atualizarEstoqueVinculo(vinculo, item.qCom);
      }

      return { sucesso: true };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  };

  return (/* ... */);
}
```

## ✨ Características

- **Silencioso**: Falhas não afetam usuário
- **Assíncrono**: Não bloqueia operação
- **Rastreável**: CSV exportável
- **Consulável**: Tela dedicada
- **Isolado**: Zero efeito colateral

---

**Criado em**: 2026-03-31
**Versão**: 1.0 (Isolamento Total)