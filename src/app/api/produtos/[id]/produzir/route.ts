import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcularFIFO } from '@/lib/fifo'
import { apiError } from '@/lib/api-error'
import { z } from 'zod'

const schema = z.object({
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  observacao: z.string().optional(),
})

/**
 * Produz mais unidades de um produto JÁ EXISTENTE, usando o BOM salvo.
 * Mesmas regras da Montagem (FIFO de MP + baixa de produtos componentes),
 * mas sem precisar reenviar a receita — ela vem do banco.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { quantidade, observacao } = schema.parse(body)

    const produto = await prisma.produto.findFirst({
      where: { id, userId: user.id },
      include: { especificacoes: true },
    })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    if (produto.especificacoes.length === 0) {
      return NextResponse.json({ error: 'Produto sem receita (BOM). Defina a receita antes de produzir.' }, { status: 409 })
    }

    // Componentes de matéria-prima → FIFO
    const componentesMP = produto.especificacoes
      .filter(e => e.tipoComponente === 'MATERIA_PRIMA' && e.materiaPrimaId)
      .map(e => ({ materiaPrimaId: e.materiaPrimaId!, quantidade: e.quantidade }))

    const resultadoFIFO = await calcularFIFO(user.id, componentesMP, quantidade)
    if (!resultadoFIFO.sucesso) {
      return NextResponse.json({
        error: 'Estoque insuficiente de matéria-prima',
        detalhes: resultadoFIFO.faltou,
      }, { status: 409 })
    }

    // Componentes que são outros produtos (kit) → valida estoque
    const componentesProduto = produto.especificacoes.filter(e => e.tipoComponente === 'PRODUTO' && e.componenteProdutoId)
    for (const comp of componentesProduto) {
      const prod = await prisma.produto.findFirst({ where: { id: comp.componenteProdutoId!, userId: user.id } })
      const qtdNecessaria = comp.quantidade * quantidade
      if (!prod || prod.estoque < qtdNecessaria) {
        return NextResponse.json({
          error: 'Estoque insuficiente do produto componente',
          detalhes: [{ nome: prod?.nome, falta: qtdNecessaria - (prod?.estoque || 0) }],
        }, { status: 409 })
      }
    }

    const custoTotal = resultadoFIFO.custoTotal
    const custoUnitario = quantidade > 0 ? custoTotal / quantidade : 0

    await prisma.$transaction(async (tx) => {
      // Incrementa estoque do produto e atualiza custo unitário (último custo de produção)
      await tx.produto.update({
        where: { id },
        data: { estoque: { increment: quantidade }, custoUnitario },
      })

      const producao = await tx.producao.create({
        data: {
          userId: user.id,
          produtoId: id,
          quantidadeProduzida: quantidade,
          custoTotal,
          custoUnitario,
          observacao,
        },
      })

      if (resultadoFIFO.consumos.length > 0) {
        await tx.consumoProducao.createMany({
          data: resultadoFIFO.consumos.map(c => ({
            producaoId: producao.id,
            materiaPrimaId: c.loteId,
            qtdConsumida: c.qtdConsumida,
            valorUnitario: c.valorUnitario,
            valorTotal: c.valorTotal,
          })),
        })
        for (const consumo of resultadoFIFO.consumos) {
          await tx.materiaPrima.update({
            where: { id: consumo.loteId },
            data: { estoqueLote: { decrement: consumo.qtdConsumida } },
          })
        }
      }

      // Baixa estoque dos produtos componentes (kit)
      for (const comp of componentesProduto) {
        await tx.produto.update({
          where: { id: comp.componenteProdutoId! },
          data: { estoque: { decrement: comp.quantidade * quantidade } },
        })
      }
    })

    return NextResponse.json({ ok: true, custoUnitario, custoTotal, quantidade }, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
}
