import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const comEstoque = searchParams.get('comEstoque') === 'true'

    const produtos = await prisma.produto.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as any } : {}),
        ...(comEstoque ? { estoque: { gt: 0 } } : {}),
      },
      include: {
        especificacoes: {
          include: {
            materiaPrima: true,
            componenteProduto: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(produtos)
  } catch (err) {
    return apiError(err)
  }
}
