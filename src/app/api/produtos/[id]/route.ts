import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'
import { apiError } from '@/lib/api-error'

const updateSchema = z.object({
  precoSugerido: z.number().min(0).optional(),
  precoVenda: z.number().min(0).optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const produto = await prisma.produto.findFirst({
      where: { id, userId: user.id },
      include: {
        especificacoes: {
          include: { materiaPrima: true, componenteProduto: true },
        },
        producoes: { orderBy: { dataProducao: 'desc' }, take: 10 },
      },
    })

    if (!produto) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json(produto)
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.produto.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const updated = await prisma.produto.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    return apiError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const existing = await prisma.produto.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    if (existing.estoque > 0) {
      return NextResponse.json({ error: 'Produto com estoque. Faça descarte antes de excluir.' }, { status: 409 })
    }

    const totalVendas = await prisma.venda.count({ where: { produtoId: id } })
    if (totalVendas > 0) {
      return NextResponse.json({
        error: `Produto possui ${totalVendas} venda(s) no histórico. Use "Arquivar" (desativar) para preservar o histórico financeiro.`,
      }, { status: 409 })
    }

    await prisma.produto.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(err)
  }
}
