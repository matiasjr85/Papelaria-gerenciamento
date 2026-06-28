import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'
import { apiError } from '@/lib/api-error'

const bomSchema = z.object({
  componentes: z.array(z.object({
    tipoComponente: z.enum(['MATERIA_PRIMA', 'PRODUTO']),
    materiaPrimaId: z.string().optional().nullable(),
    componenteProdutoId: z.string().optional().nullable(),
    quantidade: z.number().positive(),
  })).min(1),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { componentes } = bomSchema.parse(body)

    const produto = await prisma.produto.findFirst({ where: { id, userId: user.id } })
    if (!produto) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.especificacaoProduto.deleteMany({ where: { produtoId: id } })
      await tx.especificacaoProduto.createMany({
        data: componentes.map(c => ({
          produtoId: id,
          tipoComponente: c.tipoComponente,
          materiaPrimaId: c.materiaPrimaId || null,
          componenteProdutoId: c.componenteProdutoId || null,
          quantidade: c.quantidade,
        })),
      })
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(err)
  }
}
