# Auditoria Técnica — Fase 1 (Squad Enterprise)

> Data: 2026-06 · Sistema 3AJ Papelaria · Next.js 16.2.9 / React 19 / Prisma / SQLite→Postgres

## Mapa da aplicação

**Rotas (App Router)**
- `(auth)`: `/login`, `/cadastro` — públicas
- `(dashboard)`: `/dashboard`, `/materia-prima`, `/equipamentos`, `/pecas`, `/montagem`, `/produtos`, `/vendas`, `/descartes` — protegidas
- `proxy.ts` faz o gate de autenticação (redireciona sem cookie)

**APIs (19 rotas)**: auth (login/register/logout/me), materia-prima, equipamentos, pecas, produtos (+bom), montagem, vendas (+devolução), descartes, dashboard

**Banco (12 models)**: User, Session, MateriaPrima, Equipamento, PecaReposicao, Produto, EspecificacaoProduto (BOM), Producao, ConsumoProducao, Venda, HistoricoDescarte + 4 enums. Índices `@@index([userId, ...])` já presentes. ✅

**Auth**: JWT custom (`jose`, HS256) + sessão persistida em tabela `Session` + cookie httpOnly `3aj_session`. bcrypt cost 12. ✅

**Design system**: CSS Variables em `globals.css` (light/dark via `.dark`), componentes `.btn-*`, `.card`, `.input-field`, `.table-base`, feedback components (Skeleton/EmptyState/ErrorState), KpiCard, ThemeToggle.

---

## 🔴 Problemas críticos

| # | Problema | Arquivo | Risco |
|---|----------|---------|-------|
| C1 | **JWT secret com fallback hardcoded** `'3aj-papelaria-secret'`. Se a env faltar em prod, qualquer um forja tokens. | `lib/auth.ts:5` | Crítico — comprometimento total de auth |
| C2 | **Sem security headers** (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP). Clickjacking, MIME-sniffing. | `next.config.ts` | Alto |
| C3 | **Sem rate limiting** em `/api/auth/login` e `/register`. Brute-force de senha possível. | rotas auth | Alto |
| C4 | **Dashboard N+1**: ~40 queries sequenciais (1 + 12 meses × 3–4). Lentidão cresce com dados. | `api/dashboard/route.ts` | Médio-Alto (perf) |
| C5 | **Schema fixo em `sqlite`** — precisa de `postgresql` para produção; sem isso o deploy não persiste. | `schema.prisma:9` | Bloqueador de deploy |

## 🟡 Melhorias recomendadas

| # | Item | Detalhe |
|---|------|---------|
| R1 | Sessões expiradas nunca são limpas | tabela `Session` cresce indefinidamente; falta job/cleanup no logout e na verificação |
| R2 | `confirm()`/`alert()` nativos | Produtos, Vendas, Peças — substituir por modais/toasts do design system |
| R3 | Sem loading/empty/error states | Peças, Descartes, Montagem, Vendas, Produtos ainda “piscam” |
| R4 | Tratamento de erro Zod repetido | `err.errors[0]` copiado em toda rota; centralizar em handler único (`apiError`) |
| R5 | Senha mínima 6 chars | recomendar ≥ 8 + feedback de força |
| R6 | Valores monetários como `Float` | risco de arredondamento; `Decimal` é mais correto (opcional, custo de migração) |
| R7 | Sem `<html lang>` consistente / foco visível auditável | acessibilidade |

## 🟢 Melhorias opcionais

- Componentizar Toast global (provider) em vez de toasts inline por página
- Paginação reutilizável + Tooltip + Badge + Dropdown como componentes do DS
- Suspense + streaming no dashboard (Server Component) para TTFB menor
- Testes E2E Playwright (login, CRUD, venda, devolução)
- `prisma migrate` para Postgres + seed idempotente
- Observabilidade: logger estruturado em vez de `console.error`

---

## Restrições mantidas (segurança)
- `.env` está no `.gitignore` ✅ (`.env*`)
- Cookies httpOnly + secure-in-prod + sameSite lax ✅
- Multi-tenant: todas as queries filtram `userId` ✅ (verificado em vendas, dashboard, materia-prima)
- Nenhum segredo hardcoded **exceto** o fallback do JWT (C1) → corrigido na Fase 2

## Nota sobre deploy
Deploy real na **Vercel** (frontend) e **Render/Postgres** (banco) exige **as contas e login interativo do usuário** — não posso autenticar por ele. A Fase 2 deixa tudo **pronto** (schema Postgres, env templates, headers, build verde, Dockerfile/health check se necessário); o passo final de `vercel deploy` / criar o banco é executado pelo dono das contas.
