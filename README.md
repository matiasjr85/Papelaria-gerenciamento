# 3AJ Papelaria — Sistema de Gestão

Sistema web de gestão para papelarias personalizadas. Controle de matéria-prima, produção com custo FIFO, vendas com snapshot financeiro e dashboard analítico.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS v4 + CSS Variables |
| Auth | JWT customizado (jose) |
| ORM | Prisma |
| Banco Dev | SQLite |
| Banco Prod | PostgreSQL |
| Gráficos | Recharts |
| Dark Mode | next-themes |

## Funcionalidades

- **Matéria-Prima**: cadastro de lotes com cálculo automático de valor unitário
- **Equipamentos & Peças**: controle de investimentos
- **Montagem (FIFO)**: produção com custo calculado pelo lote mais antigo
- **Produtos (BOM)**: bill of materials, preços, estoque
- **Vendas**: preview ao vivo + registro com snapshot congelado + anti-duplo-clique
- **Descartes**: histórico sem impacto financeiro
- **Dashboard**: KPIs, gráfico mensal, top produtos, toggle investimentos
- **Dark Mode**: alternância light/dark via sidebar

## Rodar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed

# 3. Desenvolvimento
npm run dev
# → http://localhost:3000
```

## Variáveis de Ambiente

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run start        # servidor de produção
npm run lint         # lint
npm run db:seed      # popular banco com dados de teste
npx prisma studio    # GUI do banco de dados
npx prisma migrate dev --name <nome>  # nova migration
```

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `docs/00-auditoria-design-e-arquitetura.md` | Auditoria técnica completa |
| `docs/design-system.md` | Tokens, componentes, dark mode |
| `docs/deploy-vercel.md` | Guia de deploy na Vercel |
| `docs/decisoes-tecnicas.md` | Decisões e trade-offs |

## Arquitetura

```
src/
├── app/
│   ├── (auth)/          # Login, Cadastro
│   ├── (dashboard)/     # Área autenticada
│   └── api/             # Route Handlers
├── components/
│   ├── layout/          # Sidebar, Header
│   ├── feedback/        # EmptyState, ErrorState, Skeleton
│   └── ui/              # KpiCard, ThemeToggle
├── providers/
│   └── ThemeProvider.tsx
├── lib/
│   ├── auth.ts          # JWT + sessão
│   ├── fifo.ts          # Algoritmo FIFO
│   ├── prisma.ts        # Client singleton
│   └── validations.ts   # Zod schemas
└── types/
    └── api.ts           # ApiResponse<T>
```

## Deploy

Ver [`docs/deploy-vercel.md`](docs/deploy-vercel.md) para instruções completas.
