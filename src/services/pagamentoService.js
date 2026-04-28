const mode = import.meta.env.VITE_API_MODE

export async function gerarParcelas(dados) {
  if (mode === 'mock') {
    return gerarParcelasMock(dados)
  }

  // futuro: integrar com Edge Function
  return await gerarParcelasMock(dados)
}

function gerarParcelasMock({
  total,
  quantidadeParcelas,
  dataPrimeiroVencimento
}) {
  const parcelas = []
  const valorBase = total / quantidadeParcelas

  let soma = 0

  for (let i = 0; i < quantidadeParcelas; i++) {
    let valor = parseFloat(valorBase.toFixed(2))

    if (i === quantidadeParcelas - 1) {
      valor = parseFloat((total - soma).toFixed(2))
    }

    soma += valor

    const data = new Date(dataPrimeiroVencimento)
    data.setMonth(data.getMonth() + i)

    parcelas.push({
      numero: i + 1,
      valor,
      vencimento: data.toISOString()
    })
  }

  return {
    success: true,
    data: parcelas,
    error: null
  }
}