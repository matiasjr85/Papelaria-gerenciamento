import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/cadastro', '/api/auth/login', '/api/auth/register']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  const session = request.cookies.get('3aj_session')

  if (!isPublic && !session) {
    // Rotas de API devem responder 401 JSON (não redirecionar para HTML).
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && (pathname === '/login' || pathname === '/cadastro')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
