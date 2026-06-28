import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError } from '@/lib/api-error'

// Soma valores em 12 buckets mensais a partir de uma lista de registros.
function bucketByMonth<T>(rows: T[], getDate: (r: T) => Date, getValue: (r: T) => number): number[] {
  const buckets = new Array(12).fill(0)
  for (const r of rows) {
    const m = getDate(r).getMonth() // 0..11
    buckets[m] += getValue(r)
  }
  return buckets
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
    const mes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!) : null
    const incluirInvestimentos = searchParams.get('investimentos') !== 'false'

    // Janela do ANO inteiro — buscamos tudo de uma vez e agregamos em memória (evita N+1).
    const anoInicio = new Date(ano, 0, 1)
    const anoFim = new Date(ano, 11, 31, 23, 59, 59)

    // 4 queries no total (antes eram ~40 sequenciais).
    const [vendas, equipamentos, pecas, materiasPrimas] = await Promise.all([
      prisma.venda.findMany({
        where: { userId: user.id, status: 'ATIVA', dataVenda: { gte: anoInicio, lte: anoFim } },
        select: { produtoNome: true, valorVenda: true, totalGastos: true, quantidade: true, dataVenda: true },
      }),
      incluirInvestimentos
        ? prisma.equipamento.findMany({
            where: { userId: user.id, dataCompra: { gte: anoInicio, lte: anoFim } },
            select: { valorTotal: true, dataCompra: true },
          })
        : Promise.resolve([]),
      incluirInvestimentos
        ? prisma.pecaReposicao.findMany({
            where: { userId: user.id, dataCompra: { gte: anoInicio, lte: anoFim } },
            select: { valorTotal: true, dataCompra: true },
          })
        : Promise.resolve([]),
      prisma.materiaPrima.findMany({
        where: { userId: user.id, dataCompra: { gte: anoInicio, lte: anoFim } },
        select: { valorTotal: true, dataCompra: true },
      }),
    ])

    // Buckets mensais (índice 0 = Janeiro)
    const vendasMes = bucketByMonth(vendas, v => v.dataVenda, v => v.valorVenda)
    const taxasMes = bucketByMonth(vendas, v => v.dataVenda, v => v.totalGastos)
    const qtdVendasMes = bucketByMonth(vendas, v => v.dataVenda, () => 1)
    const equipMes = bucketByMonth(equipamentos, e => e.dataCompra, e => e.valorTotal)
    const pecasMes = bucketByMonth(pecas, p => p.dataCompra, p => p.valorTotal)
    const mpMes = bucketByMonth(materiasPrimas, m => m.dataCompra, m => m.valorTotal)

    const meses = []
    for (let m = 1; m <= 12; m++) {
      const i = m - 1
      const vTotal = vendasMes[i]
      const tTotal = taxasMes[i]
      const eTotal = equipMes[i]
      const pTotal = pecasMes[i]
      const mpTotal = mpMes[i]
      const gTotal = tTotal + eTotal + pTotal + mpTotal
      const lMes = vTotal - gTotal
      meses.push({
        mes: m,
        vendas: vTotal,
        taxas: tTotal,
        equipamentos: eTotal,
        pecas: pTotal,
        materiaPrima: mpTotal,
        totalGastos: gTotal,
        lucro: lMes,
        margem: vTotal > 0 ? (lMes / vTotal) * 100 : 0,
        qtdVendas: qtdVendasMes[i],
      })
    }

    // KPIs do período: mês selecionado ou ano inteiro
    const sumRange = (arr: number[]) =>
      mes ? arr[mes - 1] : arr.reduce((s, n) => s + n, 0)

    const totalVendas = sumRange(vendasMes)
    const totalTaxas = sumRange(taxasMes)
    const totalEquipamentos = sumRange(equipMes)
    const totalPecas = sumRange(pecasMes)
    const totalMP = sumRange(mpMes)
    const totalGastos = totalTaxas + totalEquipamentos + totalPecas + totalMP
    const lucro = totalVendas - totalGastos
    const margem = totalVendas > 0 ? (lucro / totalVendas) * 100 : 0
    const qtdVendas = mes ? qtdVendasMes[mes - 1] : vendas.length

    // Top produtos do período — agregado em memória sobre as vendas já buscadas
    const vendasPeriodo = mes
      ? vendas.filter(v => v.dataVenda.getMonth() === mes - 1)
      : vendas
    const mapaTop = new Map<string, { valorVenda: number; quantidade: number }>()
    for (const v of vendasPeriodo) {
      const cur = mapaTop.get(v.produtoNome) || { valorVenda: 0, quantidade: 0 }
      cur.valorVenda += v.valorVenda
      cur.quantidade += v.quantidade
      mapaTop.set(v.produtoNome, cur)
    }
    const topProdutos = Array.from(mapaTop.entries())
      .map(([produtoNome, _sum]) => ({ produtoNome, _sum }))
      .sort((a, b) => b._sum.valorVenda - a._sum.valorVenda)
      .slice(0, 10)

    const dataInicio = mes ? new Date(ano, mes - 1, 1) : anoInicio
    const dataFim = mes ? new Date(ano, mes, 0, 23, 59, 59) : anoFim

    return NextResponse.json({
      periodo: { ano, mes, dataInicio, dataFim },
      kpis: {
        totalVendas,
        totalTaxas,
        totalEquipamentos,
        totalPecas,
        totalMP,
        totalGastos,
        lucro,
        margem,
        qtdVendas,
      },
      meses,
      topProdutos,
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return apiError(err)
  }
}
