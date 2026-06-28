import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { pecaSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const pecas = await prisma.pecaReposicao.findMany({
      where: { userId: user.id },
      orderBy: { dataCompra: 'desc' },
      include: { equipamento: true },
    })
    return NextResponse.json(pecas)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const data = pecaSchema.parse(body)

    const peca = await prisma.pecaReposicao.create({
      data: {
        userId: user.id,
        nome: data.nome,
        valorTotal: data.valorTotal,
        dataCompra: new Date(data.dataCompra),
        equipamentoId: data.equipamentoId || null,
        descricao: data.descricao,
      },
    })
    return NextResponse.json(peca, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
}
