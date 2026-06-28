import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { descarteSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const descartes = await prisma.historicoDescarte.findMany({
      where: { userId: user.id },
      orderBy: { dataDescarte: 'desc' },
      include: { materiaPrima: true, produto: true },
    })
    return NextResponse.json(descartes)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const data = descarteSchema.parse(body)

    await prisma.$transaction(async (tx) => {
      // Registra descarte (histórico apenas — não afeta dashboard)
      await tx.historicoDescarte.create({
        data: {
          userId: user.id,
          tipo: data.tipo,
          materiaPrimaId: data.materiaPrimaId || null,
          produtoId: data.produtoId || null,
          quantidade: data.quantidade,
          motivo: data.motivo,
        },
      })

      // Baixa do estoque
      if (data.tipo === 'MATERIA_PRIMA' && data.materiaPrimaId) {
        const lote = await tx.materiaPrima.findFirst({
          where: { id: data.materiaPrimaId, userId: user.id },
        })
        if (!lote) throw new Error('Lote não encontrado')
        if (lote.estoqueLote < data.quantidade) throw new Error('Estoque insuficiente no lote')

        await tx.materiaPrima.update({
          where: { id: data.materiaPrimaId },
          data: { estoqueLote: { decrement: data.quantidade } },
        })
      } else if (data.tipo === 'PRODUTO' && data.produtoId) {
        const prod = await tx.produto.findFirst({
          where: { id: data.produtoId, userId: user.id },
        })
        if (!prod) throw new Error('Produto não encontrado')
        if (prod.estoque < data.quantidade) throw new Error('Estoque insuficiente')

        await tx.produto.update({
          where: { id: data.produtoId },
          data: { estoque: { decrement: data.quantidade } },
        })
      }
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message.includes('insuficiente')) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return apiError(err)
  }
}
