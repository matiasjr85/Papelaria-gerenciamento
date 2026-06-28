import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { materiaPrimaSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const nome = searchParams.get('nome')

    const lotes = await prisma.materiaPrima.findMany({
      where: {
        userId: user.id,
        ...(nome ? { nome: { contains: nome } } : {}),
      },
      orderBy: [{ nome: 'asc' }, { dataCompra: 'asc' }],
    })

    return NextResponse.json(lotes)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const data = materiaPrimaSchema.parse(body)

    const estoqueLote = data.qtdComprada * data.unidPorItem
    const valorUnitario = data.valorTotal / estoqueLote

    const lote = await prisma.materiaPrima.create({
      data: {
        userId: user.id,
        nome: data.nome,
        unidade: data.unidade,
        dataCompra: new Date(data.dataCompra),
        qtdComprada: data.qtdComprada,
        unidPorItem: data.unidPorItem,
        valorTotal: data.valorTotal,
        valorUnitario,
        estoqueLote,
        observacao: data.observacao,
      },
    })

    return NextResponse.json(lote, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
}
