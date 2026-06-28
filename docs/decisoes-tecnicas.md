# Decisões Técnicas — 3AJ Papelaria

## Auth: JWT customizado em vez de NextAuth

**Decisão:** Usar `jose` + cookies `httpOnly` em vez de NextAuth.js v5.

**Por quê:** NextAuth v5 com Next.js 16 tinha incompatibilidades no momento da implementação. A solução custom com `jose` é mais simples, mais transparente e sem dependências de adapters externos. O CLAUDE.md documenta "NextAuth" mas a implementação real é JWT custom.

**Trade-offs:**
- ✅ Mais simples, sem magic
- ✅ Zero dependência de providers OAuth
- ❌ Sem suporte out-of-the-box para OAuth (Google, GitHub)
- ❌ Sem refresh token automático

---

## Banco: SQLite em Dev, PostgreSQL em Prod

**Decisão:** SQLite local, PostgreSQL em produção.

**Por quê:** O ambiente Windows não tem PostgreSQL com permissões admin. SQLite zero-config para dev. Prisma abstrai a diferença — basta mudar `DATABASE_URL`.

**Atenção:** Alguns tipos SQLite divergem de PostgreSQL (ex: `DateTime` → SQLite usa string ISO, PostgreSQL usa `timestamptz`). Testar migrations em PostgreSQL antes do deploy.

---

## Algoritmo FIFO

**Decisão:** FIFO implementado na camada de serviço (`src/lib/fifo.ts`), não no banco.

**Por quê:** SQLite não suporta queries FIFO nativas eficientemente. A solução em TypeScript é legível, testável e funciona igual em SQLite e PostgreSQL.

**Invariante crítica:** `calcularFIFO()` nunca modifica o banco — apenas calcula. `executarFIFO()` aplica. Essa separação garante preview seguro sem side effects.

---

## Congelamento de Valores na Venda

**Decisão:** `precoVenda`, `custoUnitario`, `totalGastos`, `lucro` são copiados no momento da venda e nunca recalculados.

**Por quê:** Histórico de vendas deve ser imutável. Se o preço de venda de um produto mudar, vendas antigas não devem ser afetadas.

**Como funciona:** A API `/api/vendas` POST busca o produto atual, calcula os valores ao vivo e os persiste como snapshot no registro `Venda`.

---

## Multi-tenant via userId

**Decisão:** Todos os modelos têm `userId` e todas as queries filtram por `userId` do usuário logado.

**Por quê:** Design mais simples que Row-Level Security do PostgreSQL, sem overhead de políticas. Funciona igual em SQLite e PostgreSQL.

**Risco:** Se uma query esquecer o filtro `userId`, dados de outro usuário podem vazar. Mitigação: revisar todas as queries ao adicionar novas features.

---

## Tailwind v4 sem tailwind.config.js

**Decisão:** Usar Tailwind v4 com `@import "tailwindcss"` e `@theme` block em `globals.css`.

**Por quê:** Tailwind v4 migrou para CSS-first configuration. Não existe mais `tailwind.config.js` por padrão. Tokens customizados são definidos via `@theme inline { ... }`.

**Implicação:** Classes como `text-vinho` ou `bg-surface` funcionam porque os tokens estão registrados no `@theme` block.

---

## Design System via CSS Variables

**Decisão:** Todo o sistema de cores usa CSS Custom Properties (`var(--...)`) em vez de valores hardcoded.

**Por quê:** Permite dark mode sem JavaScript condicional — apenas troca a classe `.dark` no `<html>`. O `next-themes` cuida dessa troca automaticamente.

**Regra:** Nunca usar cores hardcoded como `#7B2D42` em componentes. Sempre usar `var(--vinho)`.

---

## Sidebar Mobile como Drawer

**Decisão:** Em mobile, sidebar é um drawer (panel lateral sobre o conteúdo), não um menu hamburguer simples.

**Por quê:** O drawer preserva a hierarquia visual da sidebar desktop sem reduzir o espaço de conteúdo. Abre com overlay com backdrop blur para contexto.

---

## Idempotency Key nas Vendas

**Decisão:** Cada tentativa de venda gera um UUID único no frontend que é enviado junto com o POST.

**Por quê:** Evita duplo registro se o usuário clicar duas vezes ou a rede falhar e o browser reenviar o request. O backend verifica o `idempotencyKey` antes de processar.

---

## Next.js 16 — Middleware → Proxy

**Atenção:** No Next.js 16, o arquivo `middleware.ts` foi renomeado para `proxy.ts`. O build mostra um warning. Para remover o warning em produção, renomear o arquivo.

**Status atual:** Ainda usando `middleware.ts` — funciona mas gera warning no build.
