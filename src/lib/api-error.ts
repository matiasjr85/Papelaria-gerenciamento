import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Handler de erro centralizado para rotas de API.
 * Mapeia erros conhecidos (auth, validação Zod) para respostas HTTP padronizadas,
 * sem vazar detalhes internos e sem usar `any`.
 */
export function apiError(err: unknown): NextResponse {
  if (err instanceof Error && err.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (err instanceof ZodError) {
    const first = err.issues[0]
    return NextResponse.json({ error: first?.message || 'Dados inválidos' }, { status: 400 })
  }

  console.error('[api] erro não tratado:', err)
  return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
}
