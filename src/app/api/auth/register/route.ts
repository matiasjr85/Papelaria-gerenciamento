import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { cadastroSchema } from '@/lib/validations'
import { createSession, setSessionCookie } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    // Anti-abuso: estrito em produção (5/10min), folgado em dev/test.
    const ip = clientIp(req)
    const maxCadastros = process.env.NODE_ENV === 'production' ? 5 : 100
    const rl = rateLimit(`register:${ip}`, maxCadastros, 10 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await req.json()
    const data = cadastroSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await prisma.user.create({
      data: { nome: data.nome, email: data.email, passwordHash, papelaria: data.papelaria },
    })

    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email } })
  } catch (err) {
    return apiError(err)
  }
}
