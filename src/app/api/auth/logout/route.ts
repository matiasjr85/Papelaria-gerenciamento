import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { deleteSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('3aj_session')?.value
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {})
    await deleteSessionCookie()
  }
  return NextResponse.json({ ok: true })
}
