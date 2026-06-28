import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { vendaSchema } from '@/lib/validations'
import { apiError } from '@/lib/api-error'

// Preview da venda (sem salvar)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const produtoId = searchParams.get('produtoId')
    const qtdStr = searchParams.get('quantidade')
    const taxaStr = searchParams.get('taxaPct')
    const servicoStr = searchParams.get('servicoValor')

    if (!produtoId || !qtdStr) {
      // Listar vendas (com filtros opcionais: produtoId e data)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const skip = (page - 1) * limit

      // Filtro por dia específico (YYYY-MM-DD) → intervalo do dia inteiro
      const dataStr = searchParams.get('data')
      let dataFiltro: { gte: Date; lte: Date } | undefined
      if (dataStr) {
        const [y, m, d] = dataStr.split('-').map(Number)
        if (y && m && d) {
          dataFiltro = {
            gte: new Date(y, m - 1, d, 0, 0, 0),
            lte: new Date(y, m - 1, d, 23, 59, 59, 999),
          }
        }
      }

      const where = {
        userId: user.id,
        ...(produtoId ? { produtoId } : {}),
        ...(dataFiltro ? { dataVenda: dataFiltro } : {}),
      }

      const [vendas, total] = await Promise.all([
        prisma.venda.findMany({
          where,
          orderBy: { dataVenda: 'desc' },
          skip,
          take: limit,
          include: { produto: { select: { nome: true } } },
        }),
        prisma.venda.count({ where }),
      ])

      return NextResponse.json({ vendas, total, page, pages: Math.ceil(total / limit) })
    }

    const quantidade = parseFloat(qtdStr)
    const taxaPct = parseFloat(taxaStr || '0')
    const servicoValor = parseFloat(servicoStr || '0')

    const produto = await prisma.produto.findFirst({
      where: { id: produtoId, userId: user.id },
    })

    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    if (produto.estoque < quantidade) {
      return NextResponse.json({ error: 'Estoque insuficiente', disponivel: produto.estoque }, { status: 409 })
    }

    const valorVenda = produto.precoVenda * quantidade
    const taxaValor = (taxaPct / 100) * valorVenda + servicoValor
    const lucro = valorVenda - taxaValor

    return NextResponse.json({
      produtoNome: produto.nome,
      custoUnitario: produto.custoUnitario,
      precoVenda: produto.precoVenda,
      quantidade,
      valorVenda,
      taxaPct,
      servicoValor,
      totalGastos: taxaValor,
      lucro,
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const data = vendaSchema.parse(body)

    // Trava anti-duplo-clique
    if (data.idempotencyKey) {
      const existing = await prisma.venda.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      })
      if (existing) {
        return NextResponse.json({ ok: true, venda: existing, duplicata: true })
      }
    }

    const produto = await prisma.produto.findFirst({
      where: { id: data.produtoId, userId: user.id },
    })

    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    if (produto.estoque < data.quantidade) {
      return NextResponse.json({
        error: 'Estoque insuficiente',
        disponivel: produto.estoque,
      }, { status: 409 })
    }

    // Snapshot dos valores — congelados no momento da venda
    const valorVenda = produto.precoVenda * data.quantidade
    const totalGastos = (data.taxaPct / 100) * valorVenda + data.servicoValor
    const lucro = valorVenda - totalGastos

    const venda = await prisma.$transaction(async (tx) => {
      const v = await tx.venda.create({
        data: {
          userId: user.id,
          produtoId: data.produtoId,
          produtoNome: produto.nome,
          quantidade: data.quantidade,
          custoUnitario: produto.custoUnitario,
          precoVenda: produto.precoVenda,
          taxaPct: data.taxaPct,
          servicoValor: data.servicoValor,
          totalGastos,
          valorVenda,
          lucro,
          status: 'ATIVA',
          idempotencyKey: data.idempotencyKey,
          observacao: data.observacao,
        },
      })

      await tx.produto.update({
        where: { id: data.produtoId },
        data: { estoque: { decrement: data.quantidade } },
      })

      return v
    })

    return NextResponse.json({ ok: true, venda }, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
}
