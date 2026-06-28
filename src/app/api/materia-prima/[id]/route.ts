import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { materiaPrimaSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const data = materiaPrimaSchema.parse(body)

    const existing = await prisma.materiaPrima.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const estoqueLote = data.qtdComprada * data.unidPorItem
    const valorUnitario = data.valorTotal / estoqueLote

    const updated = await prisma.materiaPrima.update({
      where: { id },
      data: {
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

    return NextResponse.json(updated)
  } catch (err) {
    return apiError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const existing = await prisma.materiaPrima.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    if (existing.estoqueLote < existing.qtdComprada * existing.unidPorItem) {
      return NextResponse.json({ error: 'Lote já foi parcialmente consumido' }, { status: 409 })
    }

    await prisma.materiaPrima.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(err)
  }
}
