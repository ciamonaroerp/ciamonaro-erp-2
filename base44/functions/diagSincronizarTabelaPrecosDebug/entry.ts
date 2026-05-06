import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { empresa_id, codigo_produto, categorias_tamanho } = body;

    console.log('[DEBUG] Entrada recebida:', {
      codigo_produto,
      categorias_tamanho,
      tipo_categorias_tamanho: typeof categorias_tamanho,
      é_array: Array.isArray(categorias_tamanho),
      conteúdo: categorias_tamanho,
    });

    // Normaliza categorias_tamanho
    let categoriasArray = [];
    if (categorias_tamanho) {
      if (Array.isArray(categorias_tamanho)) {
        categoriasArray = categorias_tamanho.filter(c => c);
      } else if (typeof categorias_tamanho === 'string') {
        const parsed = JSON.parse(categorias_tamanho);
        categoriasArray = (Array.isArray(parsed) ? parsed : []).filter(c => c);
      }
    }

    console.log('[DEBUG] Categorias processadas:', {
      original: categorias_tamanho,
      processado: categoriasArray,
      qtd: categoriasArray.length,
    });

    // Busca um produto para testar
    const { data: produtoData } = await base44.asServiceRole.entities.ProdutoComercial.filter(
      { empresa_id, codigo_produto },
      null,
      1
    );

    const produto = (produtoData || [])[0];

    console.log('[DEBUG] Produto encontrado:', {
      id: produto?.id,
      codigo_produto: produto?.codigo_produto,
      categorias_tamanho: produto?.categorias_tamanho,
    });

    if (produto && categoriasArray.length > 0) {
      // Simula o que aconteceria no upsert
      const registroExemplo = {
        empresa_id,
        produto_id: produto.id,
        codigo_produto: produto.codigo_produto,
        categoria_tamanho_id: categoriasArray[0], // Primeiro UUID
        artigo_nome: 'TEST',
        consumo_un: 1.5,
        status: 'ativo',
      };

      console.log('[DEBUG] Registro de exemplo para upsert:', registroExemplo);
      
      return Response.json({
        success: true,
        debug: {
          categorias_recebidas: categorias_tamanho,
          categorias_processadas: categoriasArray,
          produto_encontrado: {
            id: produto.id,
            codigo_produto: produto.codigo_produto,
          },
          registro_exemplo: registroExemplo,
        },
      });
    }

    return Response.json({
      error: 'Produto não encontrado ou categorias vazias',
      debug: { categoriasArray, produto: !produto ? 'não encontrado' : 'encontrado' },
    }, { status: 400 });
  } catch (error) {
    console.error('[DEBUG] Exception:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});