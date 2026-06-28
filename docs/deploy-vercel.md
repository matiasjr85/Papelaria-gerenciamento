# Deploy na Vercel — 3AJ Papelaria

## Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Banco PostgreSQL (recomendado: [Neon](https://neon.tech) ou [Supabase](https://supabase.com) — free tier)
3. Repositório Git (GitHub, GitLab ou Bitbucket)

---

## Variáveis de Ambiente (Produção)

Configure estas variáveis no painel da Vercel antes do deploy:

```
DATABASE_URL=postgresql://user:password@host:5432/3aj_db?sslmode=require
NEXTAUTH_SECRET=<string aleatória 32+ chars>
NEXTAUTH_URL=https://seu-projeto.vercel.app
```

**Gerar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**Nunca commitar** o arquivo `.env` — use apenas variáveis de ambiente da Vercel.

---

## Configurar Banco PostgreSQL

### Opção 1: Neon (Recomendado — Free)

1. Criar conta em [neon.tech](https://neon.tech)
2. Criar um novo projeto
3. Copiar a connection string PostgreSQL
4. Usar como `DATABASE_URL` na Vercel

### Opção 2: Supabase

1. Criar projeto em [supabase.com](https://supabase.com)
2. Settings → Database → Connection string (URI mode)
3. Usar como `DATABASE_URL`

---

## Adaptar Prisma para PostgreSQL

⚠️ **Importante:** o `provider` do datasource no Prisma **NÃO** pode ser uma env var —
ele é fixo no `schema.prisma`. Hoje está `provider = "sqlite"` (dev). Para produção é
preciso trocar para `postgresql`.

**Passo a passo (produção):**

```bash
# 1. No prisma/schema.prisma, trocar o datasource:
#    datasource db {
#      provider = "postgresql"   // era "sqlite"
#      url      = env("DATABASE_URL")
#    }

# 2. Apagar as migrations antigas de SQLite (incompatíveis com Postgres):
#    rm -rf prisma/migrations

# 3. Gerar a migration inicial já no Postgres:
DATABASE_URL="postgresql://..." npx prisma migrate dev --name init

#    (No CI/Vercel use `prisma migrate deploy` em vez de `migrate dev`.)

# 4. (Opcional) Popular dados demo:
DATABASE_URL="postgresql://..." npm run db:seed
```

> Dica: para manter SQLite em dev e Postgres em prod sem editar o schema toda vez,
> mantenha dois arquivos (`schema.sqlite.prisma` / `schema.postgres.prisma`) ou use
> uma branch/var de build. Para o tamanho atual do projeto, trocar o `provider`
> diretamente no deploy é suficiente.

**Geração do Prisma Client na Vercel:** já configurada via `"postinstall": "prisma generate"`
no `package.json` — sem isso o build da Vercel falha.

---

## Deploy via CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login (interativo — faça no terminal local)
vercel login

# Deploy de produção (usar token via env, nunca hard-coded)
VERCEL_TOKEN=$VERCEL_TOKEN npx vercel --prod
```

---

## Deploy via GitHub (Recomendado)

1. Push do código para GitHub
2. Acessar [vercel.com/new](https://vercel.com/new)
3. Importar repositório
4. Configurar variáveis de ambiente
5. Deploy automático em cada push para `main`

---

## Configuração next.config.ts para Produção

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig;
```

---

## Checklist de Deploy

- [ ] `DATABASE_URL` configurada (PostgreSQL)
- [ ] `NEXTAUTH_SECRET` configurada (32+ chars)
- [ ] `NEXTAUTH_URL` configurada com URL real da Vercel
- [ ] Migrations rodadas no banco de produção
- [ ] Build local passando: `npm run build`
- [ ] `.env` no `.gitignore`
- [ ] Sem segredos no código-fonte

---

## Middleware — Atenção Next.js 16

O arquivo `middleware.ts` está deprecated no Next.js 16 — renomear para `proxy.ts`:

```bash
# Na raiz de src/
mv src/middleware.ts src/proxy.ts
```

O comportamento é idêntico, apenas o nome do arquivo muda.

---

## Troubleshooting

**Build falha com "PrismaClientInitializationError":**
- Verificar `DATABASE_URL` na Vercel
- Garantir que o banco aceita conexões do IP da Vercel (whitelist)

**"UNAUTHORIZED" em todas as rotas:**
- Verificar `NEXTAUTH_SECRET` — deve ser igual entre deploys
- Verificar `NEXTAUTH_URL` — deve ser a URL exata sem trailing slash

**Sessões não persistem:**
- Cookie `3aj_session` deve ter `secure: true` em produção (já configurado)
- Verificar que `NODE_ENV=production` está definido
