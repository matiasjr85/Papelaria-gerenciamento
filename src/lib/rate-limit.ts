/**
 * Rate limiter leve em memória (sliding window por janela fixa).
 *
 * ⚠️ Limitação: o estado vive no processo. Em serverless (Vercel) cada
 * instância tem seu próprio mapa, então o limite é por-instância, não global.
 * Para limite global e robusto em produção use Upstash Redis / @vercel/kv.
 * Mesmo assim, isto já barra brute-force trivial vindo de um único cliente.
 */

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

// Limpeza periódica para não vazar memória.
let lastSweep = 0
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, b] of store) {
    if (b.resetAt <= now) store.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * @param key      identificador (ex.: `login:${ip}`)
 * @param limit    máximo de requisições na janela
 * @param windowMs tamanho da janela em ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 }
}

/** Extrai um IP aproximado dos headers de proxy (Vercel/Render usam x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}
