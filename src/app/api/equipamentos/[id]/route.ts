import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { equipamentoSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const data = equipamentoSchema.parse(body)

    const existing = await prisma.equipamento.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const updated = await prisma.equipamento.update({
      where: { id },
      data: { nome: data.nome, valorTotal: data.valorTotal, dataCompra: new Date(data.dataCompra), descricao: data.descricao },
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

    const existing = await prisma.equipamento.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    await prisma.equipamento.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(err)
  }
}
