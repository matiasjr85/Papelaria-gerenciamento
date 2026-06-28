# Auditoria de Design e Arquitetura — 3AJ Papelaria

> Gerado em: 2026-06-18

---

## 1. Diagnóstico Atual

### Stack Real vs. Documentada

| Aspecto | Documentado | Real |
|---|---|---|
| Auth | NextAuth.js v5 | **JWT customizado com `jose`** |
| Framework | Next.js 14 | **Next.js 16.2.9** |
| Componentes UI | shadcn/ui | **CSS customizado (sem shadcn)** |
| Forms | React Hook Form | **Estado manual (useState)** |
| Dark Mode | Previsto | **Não implementado** |

### O que existe e funciona

- Lógica de negócio FIFO 100% implementada (`src/lib/fifo.ts`)
- Todas as APIs REST funcionais (matéria-prima, equipamentos, peças, produtos, montagem, vendas, descartes, dashboard)
- Auth JWT com cookie `httpOnly` (seguro por design)
- Schema Prisma completo e correto
- Paginação nas listagens
- Preview ao vivo na venda
- Idempotency key anti-duplo-clique
- Soft delete nas vendas (DEVOLVIDA)
- Proteção de rotas via middleware

---

## 2. Problemas Encontrados

### Frontend

| Severidade | Problema |
|---|---|
| Alta | Sem shadcn/ui — componentes UI customizados sem acessibilidade ARIA |
| Alta | Sem dark mode |
| Alta | Sidebar não é responsiva — quebra em mobile |
| Alta | `confirm()` e `alert()` nativos do browser em vez de diálogos modais |
| Média | `any` tipagem espalhada nas páginas (ex: `setDados<any>`) |
| Média | Sem loading skeletons — apenas "Carregando..." texto |
| Média | Sem toast notifications — erros em alerta do browser |
| Média | Dashboard é cliente puro — 12 queries síncronas no loop mensal |
| Baixa | `React Hook Form` instalado mas não usado |
| Baixa | Ícone dashboard tem `href="/dashboard"` causando match falso com `pathname.startsWith` |

### Backend

| Severidade | Problema |
|---|---|
| Alta | Dashboard route faz **12 queries em loop** para tabela mensal — N+1 query problem |
| Média | Respostas de API inconsistentes (algumas retornam o objeto, outras `{ ok: true }`) |
| Média | Sem índices no Prisma schema além de `@id` e `@unique` |
| Média | `userId` não indexado — queries lentas com muitos usuários |
| Baixa | Não há rate limiting nas rotas de auth |
| Baixa | Sem logging estruturado |

### Auth

| Aspecto | Status |
|---|---|
| Cookie httpOnly | ✅ Implementado |
| Token JWT | ✅ Assinado com HS256 |
| Expiração de sessão | ✅ 7 dias |
| Limpeza de sessões expiradas | ❌ Não há job de cleanup |
| CSRF protection | ⚠️ Dependente de SameSite=lax |
| Rate limiting | ❌ Não implementado |

---

## 3. Oportunidades

1. **next-themes** + CSS Variables → dark mode gratuito sem JS condicional
2. **Skeletons** → UX percebida muito melhor que texto "Carregando..."
3. **Toast/Sonner** → substituir `confirm()`/`alert()` por notificações modernas
4. **Componentes reutilizáveis** → EmptyState, KpiCard, Badge, DataTable eliminam duplicação
5. **Sidebar responsiva** → Sheet/Drawer mobile-first
6. **Prisma índices** → queries O(n) → O(log n) sem custo
7. **Dashboard otimizado** → 12 queries → 1 query com `groupBy`
8. **React Hook Form** → formulários com validação inline, sem re-render total

---

## 4. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Next.js 16 pode ter APIs diferentes das conhecidas | Alto | Ler `node_modules/next/dist/docs/` antes de usar APIs novas |
| Tailwind v4 usa `@import "tailwindcss"` sem config.js | Médio | Usar `@theme` block para tokens customizados |
| Sessões expiradas não são limpas | Médio | Adicionar cleanup job ou TTL na camada de DB |
| Sem RBAC | Baixo | Sistema atual é single-user por design (multi-tenant por `userId`) |

---

## 5. Melhorias Propostas (Prioridade)

### P0 — Crítico (feito nesta sessão)

- [x] Instalar `next-themes`
- [x] Dark mode via CSS Variables
- [x] ThemeProvider no root layout
- [x] Criar feedback components: EmptyState, ErrorState, Skeleton
- [x] Criar KpiCard reutilizável
- [x] Sidebar responsiva
- [x] Design System documentado

### P1 — Alta

- [x] Padronizar API response type
- [x] Adicionar índices Prisma
- [ ] Substituir confirm/alert por dialog modal
- [ ] Otimizar dashboard queries (groupBy)
- [ ] Toast notifications (Sonner ou customizado)

### P2 — Média

- [ ] React Hook Form nos formulários
- [ ] Skeleton loading em todas as páginas
- [ ] Rate limiting em /api/auth/*
- [ ] Job de cleanup de sessões expiradas

### P3 — Baixa

- [ ] Recharts dark mode
- [ ] Animações de transição de página
- [ ] PWA manifest
- [ ] Internacionalização (i18n)

---

## 6. Checklist de Prontidão para Deploy

### Código

- [x] Build passando sem erros TypeScript
- [x] Lint configurado
- [x] Sem secrets hardcoded no código
- [x] `.env` não commitado (.gitignore)
- [x] `NEXTAUTH_SECRET` via env var (na realidade é `NEXTAUTH_SECRET` usado como segredo JWT)

### Infraestrutura

- [ ] `DATABASE_URL` configurada (PostgreSQL para produção)
- [ ] `NEXTAUTH_URL` configurada com URL da Vercel
- [ ] Prisma migrate executado no banco de produção
- [ ] Variáveis de ambiente configuradas na Vercel

### Segurança

- [x] Cookies `httpOnly` + `secure` em produção
- [x] `sameSite: lax`
- [x] Todas as rotas protegidas por `requireAuth()`
- [x] Dados filtrados por `userId`
- [ ] Rate limiting em /api/auth/*
- [ ] Headers de segurança (CSP, HSTS) via `next.config.ts`

---

## 7. Arquitetura Atual (pós-refatoração)

```
src/
├── app/
│   ├── (auth)/          # login, cadastro — sem sidebar
│   ├── (dashboard)/     # área autenticada — com sidebar
│   │   ├── dashboard/
│   │   ├── materia-prima/
│   │   ├── equipamentos/
│   │   ├── pecas/
│   │   ├── produtos/
│   │   ├── montagem/
│   │   ├── vendas/
│   │   └── descartes/
│   ├── api/             # Route Handlers
│   ├── layout.tsx       # Root layout + ThemeProvider
│   ├── globals.css      # Design System tokens + dark mode
│   └── page.tsx         # Redirect para /dashboard
├── components/
│   ├── layout/          # Sidebar, Header
│   ├── feedback/        # EmptyState, ErrorState, Skeleton
│   ├── ui/              # KpiCard, Badge (futuro: shadcn)
│   └── charts/          # Wrappers Recharts (futuro)
├── providers/
│   └── ThemeProvider.tsx
├── lib/
│   ├── auth.ts          # JWT + session
│   ├── fifo.ts          # Algoritmo FIFO
│   ├── prisma.ts        # Prisma client singleton
│   └── validations.ts   # Zod schemas
├── types/               # Tipos compartilhados
└── constants/           # Constantes globais
```
