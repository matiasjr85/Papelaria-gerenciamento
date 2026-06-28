import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcularFIFO, executarFIFO } from '@/lib/fifo'
import { montagemSchema } from '@/lib/validations'
import { z } from 'zod'
import { apiError } from '@/lib/api-error'

// Valida estoque disponível antes de produzir (preview)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const produtoId = searchParams.get('produtoId')
    const qtdStr = searchParams.get('quantidade')

    if (!produtoId || !qtdStr) {
      return NextResponse.json({ error: 'produtoId e quantidade obrigatórios' }, { status: 400 })
    }

    const quantidade = parseFloat(qtdStr)
    const produto = await prisma.produto.findFirst({
      where: { id: produtoId, userId: user.id },
      include: { especificacoes: { include: { materiaPrima: true, componenteProduto: true } } },
    })

    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    // Calcula FIFO para componentes MP
    const componentesMP = produto.especificacoes
      .filter(e => e.tipoComponente === 'MATERIA_PRIMA' && e.materiaPrimaId)
      .map(e => ({ materiaPrimaId: e.materiaPrimaId!, quantidade: e.quantidade }))

    const resultadoFIFO = await calcularFIFO(user.id, componentesMP, quantidade)

    // Verifica componentes produto
    const componentesProduto = produto.especificacoes
      .filter(e => e.tipoComponente === 'PRODUTO' && e.componenteProdutoId)

    const faltaProdutos: any[] = []
    for (const comp of componentesProduto) {
      const compProd = await prisma.produto.findUnique({ where: { id: comp.componenteProdutoId! } })
      const qtdNecessaria = comp.quantidade * quantidade
      if (!compProd || compProd.estoque < qtdNecessaria) {
        faltaProdutos.push({
          produtoId: comp.componenteProdutoId,
          nome: compProd?.nome || comp.componenteProdutoId,
          falta: qtdNecessaria - (compProd?.estoque || 0),
          disponivel: compProd?.estoque || 0,
        })
      }
    }

    const custoTotal = resultadoFIFO.custoTotal
    const custoUnitario = quantidade > 0 ? custoTotal / quantidade : 0

    return NextResponse.json({
      sucesso: resultadoFIFO.sucesso && faltaProdutos.length === 0,
      custoTotal,
      custoUnitario,
      faltaMP: resultadoFIFO.faltou,
      faltaProdutos: faltaProdutos.length > 0 ? faltaProdutos : undefined,
      consumos: resultadoFIFO.consumos,
      maximoPossivel: calcularMaximoPossivel(produto.especificacoes, user.id),
    })
  } catch (err) {
    return apiError(err)
  }
}

async function calcularMaximoPossivel(especificacoes: any[], userId: string): Promise<number> {
  let maximo = Infinity
  for (const esp of especificacoes) {
    if (esp.tipoComponente === 'MATERIA_PRIMA' && esp.materiaPrimaId) {
      const lotes = await prisma.materiaPrima.findMany({
        where: { id: esp.materiaPrimaId, userId, estoqueLote: { gt: 0 } },
      })
      const total = lotes.reduce((s: number, l: any) => s + l.estoqueLote, 0)
      const maxPorEste = esp.quantidade > 0 ? Math.floor(total / esp.quantidade) : Infinity
      maximo = Math.min(maximo, maxPorEste)
    } else if (esp.tipoComponente === 'PRODUTO' && esp.componenteProdutoId) {
      const prod = await prisma.produto.findUnique({ where: { id: esp.componenteProdutoId } })
      const maxPorEste = esp.quantidade > 0 ? Math.floor((prod?.estoque || 0) / esp.quantidade) : Infinity
      maximo = Math.min(maximo, maxPorEste)
    }
  }
  return maximo === Infinity ? 0 : maximo
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const data = montagemSchema.parse(body)

    // Valida estoque de todos os componentes antes de processar
    const componentesMP = data.componentes
      .filter(c => c.tipoComponente === 'MATERIA_PRIMA' && c.materiaPrimaId)
      .map(c => ({ materiaPrimaId: c.materiaPrimaId!, quantidade: c.quantidade }))

    const resultadoFIFO = await calcularFIFO(user.id, componentesMP, data.qtdProduzir)

    if (!resultadoFIFO.sucesso) {
      return NextResponse.json({
        error: 'Estoque insuficiente de matéria-prima',
        detalhes: resultadoFIFO.faltou,
      }, { status: 409 })
    }

    // Verifica componentes produto
    for (const comp of data.componentes.filter(c => c.tipoComponente === 'PRODUTO')) {
      const prod = await prisma.produto.findFirst({ where: { id: comp.componenteProdutoId!, userId: user.id } })
      const qtdNecessaria = comp.quantidade * data.qtdProduzir
      if (!prod || prod.estoque < qtdNecessaria) {
        return NextResponse.json({
          error: `Estoque insuficiente do produto componente`,
          detalhes: [{ nome: prod?.nome, falta: qtdNecessaria - (prod?.estoque || 0) }],
        }, { status: 409 })
      }
    }

    // Verifica se produto já existe (pelo nome, do mesmo user)
    const produtoExistente = await prisma.produto.findFirst({
      where: { userId: user.id, nome: data.nome },
    })

    const custoTotal = resultadoFIFO.custoTotal
    const custoUnitario = data.qtdProduzir > 0 ? custoTotal / data.qtdProduzir : 0

    await prisma.$transaction(async (tx) => {
      let produto: any

      if (produtoExistente) {
        // Produzir mais ou atualizar preço
        produto = await tx.produto.update({
          where: { id: produtoExistente.id },
          data: {
            estoque: { increment: data.qtdProduzir },
            custoUnitario,
            precoSugerido: data.precoSugerido,
            precoVenda: data.precoVenda,
          },
        })
      } else {
        // Produto novo
        produto = await tx.produto.create({
          data: {
            userId: user.id,
            nome: data.nome,
            custoUnitario,
            precoSugerido: data.precoSugerido,
            precoVenda: data.precoVenda,
            estoque: data.qtdProduzir,
            status: 'ATIVO',
          },
        })

        // Salva BOM
        await tx.especificacaoProduto.createMany({
          data: data.componentes.map(c => ({
            produtoId: produto.id,
            tipoComponente: c.tipoComponente,
            materiaPrimaId: c.materiaPrimaId || null,
            componenteProdutoId: c.componenteProdutoId || null,
            quantidade: c.quantidade,
          })),
        })
      }

      // Cria registro de produção
      const producao = await tx.producao.create({
        data: {
          userId: user.id,
          produtoId: produto.id,
          quantidadeProduzida: data.qtdProduzir,
          custoTotal,
          custoUnitario,
          observacao: data.observacao,
        },
      })

      // Registra consumos FIFO
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

        // Atualiza estoque dos lotes (FIFO)
        for (const consumo of resultadoFIFO.consumos) {
          await tx.materiaPrima.update({
            where: { id: consumo.loteId },
            data: { estoqueLote: { decrement: consumo.qtdConsumida } },
          })
        }
      }

      // Baixa estoque de produtos componentes
      for (const comp of data.componentes.filter(c => c.tipoComponente === 'PRODUTO')) {
        await tx.produto.update({
          where: { id: comp.componenteProdutoId! },
          data: { estoque: { decrement: comp.quantidade * data.qtdProduzir } },
        })
      }

      return produto
    })

    return NextResponse.json({ ok: true, custoUnitario, custoTotal }, { status: 201 })
  } catch (err) {
    console.error('Montagem error:', err)
    return apiError(err)
  }
}
