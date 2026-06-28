import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError } from '@/lib/api-error'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const venda = await prisma.venda.findFirst({
      where: { id, userId: user.id },
    })

    if (!venda) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    if (venda.status === 'DEVOLVIDA') {
      return NextResponse.json({ error: 'Venda já foi devolvida' }, { status: 409 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.venda.update({
        where: { id },
        data: { status: 'DEVOLVIDA' },
      })

      await tx.produto.update({
        where: { id: venda.produtoId },
        data: { estoque: { increment: venda.quantidade } },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(err)
  }
}
