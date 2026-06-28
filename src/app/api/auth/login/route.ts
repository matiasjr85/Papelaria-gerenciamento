import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import { createSession, setSessionCookie } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    // Anti brute-force: estrito em produção (8/5min), folgado em dev/test.
    const ip = clientIp(req)
    const maxTentativas = process.env.NODE_ENV === 'production' ? 8 : 100
    const rl = rateLimit(`login:${ip}`, maxTentativas, 5 * 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await req.json()
    const data = loginSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { email: data.email } })
    if (!user) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email, papelaria: user.papelaria } })
  } catch (err) {
    return apiError(err)
  }
}
