import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from './prisma'

function resolveSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && secret.length >= 16) return new TextEncoder().encode(secret)
  // Em produção, NUNCA usar fallback: falha rápido para evitar tokens forjáveis.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXTAUTH_SECRET ausente ou fraco em produção. Defina uma chave forte (>= 32 chars).'
    )
  }
  // Dev only: gera uma chave EFÊMERA aleatória em memória (nenhum segredo hardcoded).
  // Efeito colateral aceitável: ao reiniciar o servidor de dev, as sessões expiram.
  console.warn('[auth] NEXTAUTH_SECRET ausente — gerando chave EFÊMERA de desenvolvimento. Defina NEXTAUTH_SECRET no .env.')
  return crypto.getRandomValues(new Uint8Array(32))
}

const SECRET = resolveSecret()
const COOKIE_NAME = '3aj_session'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 dias

export type SessionUser = {
  id: string
  email: string
  nome: string
  papelaria: string
}

export async function createSession(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET)

  const expiresAt = new Date(Date.now() + MAX_AGE * 1000)
  await prisma.session.create({ data: { userId, token, expiresAt } })

  return token
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, SECRET)
    const userId = payload.userId as string

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      // Limpa sessão expirada para a tabela não crescer indefinidamente.
      if (session) await prisma.session.deleteMany({ where: { token } }).catch(() => {})
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      nome: session.user.nome,
      papelaria: session.user.papelaria,
    }
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}
