// FIFO — Algoritmo de consumo por lote mais antigo primeiro
// Regra de negócio: ao produzir, consome lotes de MP em ordem de dataCompra ASC

import { prisma } from './prisma'

export type ConsumoLote = {
  materiaPrimaId: string
  loteId: string
  qtdConsumida: number
  valorUnitario: number
  valorTotal: number
}

export type ResultadoFIFO = {
  consumos: ConsumoLote[]
  custoTotal: number
  sucesso: boolean
  faltou?: { materiaPrimaId: string; nome: string; falta: number; disponivel: number }[]
}

export type ComponenteMP = {
  materiaPrimaId: string
  quantidade: number // quantidade necessária para 1 unidade do produto
}

/**
 * Valida e calcula o consumo FIFO para produzir `qtdProduzida` unidades.
 * Não faz alterações no banco — apenas calcula.
 */
export async function calcularFIFO(
  userId: string,
  componentes: ComponenteMP[],
  qtdProduzida: number
): Promise<ResultadoFIFO> {
  const consumos: ConsumoLote[] = []
  let custoTotal = 0
  const faltou: ResultadoFIFO['faltou'] = []

  for (const comp of componentes) {
    const qtdNecessaria = comp.quantidade * qtdProduzida

    // Busca lotes disponíveis do mais antigo para o mais novo
    const lotes = await prisma.materiaPrima.findMany({
      where: {
        id: comp.materiaPrimaId,
        userId,
        estoqueLote: { gt: 0 },
      },
      orderBy: { dataCompra: 'asc' },
    })

    const mp = await prisma.materiaPrima.findUnique({ where: { id: comp.materiaPrimaId } })
    const nomeMP = mp?.nome || comp.materiaPrimaId

    const disponivelTotal = lotes.reduce((s, l) => s + l.estoqueLote, 0)

    if (disponivelTotal < qtdNecessaria) {
      faltou.push({
        materiaPrimaId: comp.materiaPrimaId,
        nome: nomeMP,
        falta: qtdNecessaria - disponivelTotal,
        disponivel: disponivelTotal,
      })
      continue
    }

    let restante = qtdNecessaria
    for (const lote of lotes) {
      if (restante <= 0) break
      const consumido = Math.min(restante, lote.estoqueLote)
      const valorTotalConsumo = consumido * lote.valorUnitario

      consumos.push({
        materiaPrimaId: comp.materiaPrimaId,
        loteId: lote.id,
        qtdConsumida: consumido,
        valorUnitario: lote.valorUnitario,
        valorTotal: valorTotalConsumo,
      })

      custoTotal += valorTotalConsumo
      restante -= consumido
    }
  }

  return {
    consumos,
    custoTotal,
    sucesso: faltou.length === 0,
    faltou: faltou.length > 0 ? faltou : undefined,
  }
}

/**
 * Executa o consumo FIFO no banco de dados (dentro de uma transação).
 * Deve ser chamado APÓS calcularFIFO com sucesso.
 */
export async function executarFIFO(consumos: ConsumoLote[]) {
  for (const consumo of consumos) {
    await prisma.materiaPrima.update({
      where: { id: consumo.loteId },
      data: { estoqueLote: { decrement: consumo.qtdConsumida } },
    })
  }
}
