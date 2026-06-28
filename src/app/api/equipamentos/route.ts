import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { equipamentoSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const equips = await prisma.equipamento.findMany({
      where: { userId: user.id },
      orderBy: { nome: 'asc' },
      include: { pecasReposicao: { orderBy: { dataCompra: 'asc' } } },
    })
    return NextResponse.json(equips)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const data = equipamentoSchema.parse(body)

    const equip = await prisma.equipamento.create({
      data: { userId: user.id, nome: data.nome, valorTotal: data.valorTotal, dataCompra: new Date(data.dataCompra), descricao: data.descricao },
    })
    return NextResponse.json(equip, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
}
