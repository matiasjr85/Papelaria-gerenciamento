import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Usuário demo — credenciais configuráveis por env (override em produção).
  const demoEmail = process.env.SEED_DEMO_EMAIL || 'demo@3aj.com'
  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'demo123'
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      nome: 'Demo 3AJ',
      email: demoEmail,
      passwordHash: await bcrypt.hash(demoPassword, 12),
      papelaria: '3AJ Papelaria Demo',
    },
  })
  console.log('User:', user.email)

  // Matéria-prima (3 lotes — para testar FIFO)
  const hoje = new Date()
  const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 15)
  const doisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 10)

  const lote1 = await prisma.materiaPrima.upsert({
    where: { id: 'seed-mp-papel-1' },
    update: {},
    create: {
      id: 'seed-mp-papel-1',
      userId: user.id,
      nome: 'Papel A4 75g',
      unidade: 'resma',
      dataCompra: doisMesesAtras,
      qtdComprada: 10,
      unidPorItem: 1,
      valorTotal: 150.00,
      valorUnitario: 15.00,
      estoqueLote: 8,
    },
  })

  const lote2 = await prisma.materiaPrima.upsert({
    where: { id: 'seed-mp-papel-2' },
    update: {},
    create: {
      id: 'seed-mp-papel-2',
      userId: user.id,
      nome: 'Papel A4 75g',
      unidade: 'resma',
      dataCompra: mesPassado,
      qtdComprada: 20,
      unidPorItem: 1,
      valorTotal: 280.00,
      valorUnitario: 14.00,
      estoqueLote: 20,
    },
  })

  const tinta = await prisma.materiaPrima.upsert({
    where: { id: 'seed-mp-tinta-1' },
    update: {},
    create: {
      id: 'seed-mp-tinta-1',
      userId: user.id,
      nome: 'Tinta Vermelha',
      unidade: 'litro',
      dataCompra: mesPassado,
      qtdComprada: 5,
      unidPorItem: 1,
      valorTotal: 200.00,
      valorUnitario: 40.00,
      estoqueLote: 5,
    },
  })

  // Equipamento
  const equip = await prisma.equipamento.upsert({
    where: { id: 'seed-equip-1' },
    update: {},
    create: {
      id: 'seed-equip-1',
      userId: user.id,
      nome: 'Impressora Laser',
      valorTotal: 2500.00,
      dataCompra: doisMesesAtras,
      descricao: 'HP LaserJet Pro',
    },
  })

  // Peça de reposição
  await prisma.pecaReposicao.upsert({
    where: { id: 'seed-peca-1' },
    update: {},
    create: {
      id: 'seed-peca-1',
      userId: user.id,
      nome: 'Cartucho de Toner',
      valorTotal: 180.00,
      dataCompra: mesPassado,
      equipamentoId: equip.id,
    },
  })

  console.log('Seed completo!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
