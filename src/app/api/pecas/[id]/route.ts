import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { pecaSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const data = pecaSchema.parse(body)

    const existing = await prisma.pecaReposicao.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const updated = await prisma.pecaReposicao.update({
      where: { id },
      data: { nome: data.nome, valorTotal: data.valorTotal, dataCompra: new Date(data.dataCompra), equipamentoId: data.equipamentoId || null, descricao: data.descricao },
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

    const existing = await prisma.pecaReposicao.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    await prisma.pecaReposicao.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(err)
  }
}
