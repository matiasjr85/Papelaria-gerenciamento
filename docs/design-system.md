# Design System — 3AJ Papelaria

## Paleta de Cores

### Cores da Marca

| Token | Hex | Uso |
|---|---|---|
| `--vinho` | `#7B2D42` | Primary / Botões principais / Sidebar |
| `--vinho-dark` | `#5a1f30` | Hover de elementos primários |
| `--vinho-light` | `#9d4a62` | Variante light do primário |
| `--rosa` | `#E8A0B4` | Secondary / Highlights |
| `--rosa-light` | `#f5d0dc` | Hover de botões secundários |
| `--amarelo` | `#F5C842` | Accent / Gráfico de gastos |
| `--amarelo-dark` | `#d4a800` | Hover / KPI gastos |
| `--azul` | `#4A90D9` | Info / Gráfico de vendas |

### Cores Semânticas

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--success` | `#16A34A` | `#16A34A` | Sucesso / Estoque OK |
| `--danger` | `#DC2626` | `#DC2626` | Erro / Estoque negativo |
| `--warning` | `#92400E` | `#92400E` | Alertas / Devolvida |
| `--info` | `#1D4ED8` | `#1D4ED8` | Informações |

### Superfícies

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAFAFA` | `#0F0F14` |
| `--bg-subtle` | `#F3F4F6` | `#1A1A24` |
| `--surface` | `#FFFFFF` | `#1E1E2E` |
| `--surface-raised` | `#FFFFFF` | `#262636` |
| `--border` | `#E5E7EB` | `#2D2D42` |
| `--border-subtle` | `#F3F4F6` | `#252535` |

---

## Tipografia

**Fonte:** Geist (Google Fonts) → fallback: `system-ui, -apple-system, sans-serif`

| Escala | Classe | Tamanho | Uso |
|---|---|---|---|
| xs | `text-xs` | 0.75rem | Badges, labels uppercase, metadados |
| sm | `text-sm` | 0.875rem | Corpo de tabelas, inputs, subtítulos |
| base | `text-base` | 1rem | Texto padrão |
| lg | `text-lg` | 1.125rem | Títulos de modais |
| xl | `text-xl` | 1.25rem | — |
| 2xl | `text-2xl` | 1.5rem | Títulos de página (`Header`) |

| Weight | Classe | Uso |
|---|---|---|
| Regular | `font-normal` | Corpo de texto |
| Medium | `font-medium` | Labels, botões |
| Semibold | `font-semibold` | Cabeçalhos de seção |
| Bold | `font-bold` | Títulos, KPI values |

---

## Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 4px | Tags pequenas |
| `--radius` | 8px | Inputs, botões |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Modais |
| `--radius-full` | 9999px | Badges, avatars |

---

## Sombras

| Token | Uso |
|---|---|
| `--shadow-sm` | Cards em repouso |
| `--shadow` | Cards elevados |
| `--shadow-md` | Dropdowns |
| `--shadow-lg` | Popovers |
| `--shadow-xl` | Tooltips |
| `--shadow-modal` | Modais |

---

## Motion

| Token | Valor | Uso |
|---|---|---|
| `--duration-fast` | 100ms | Hover de ícones |
| `--duration-base` | 150ms | Hover de botões e inputs |
| `--duration-slow` | 250ms | Modais, transições de tema |
| `--ease-default` | cubic-bezier(0.4, 0, 0.2, 1) | Material Design ease |

**Animações globais:**
- `modal-in`: entrada de modais (fade + translateY + scale)
- `skeleton-wave`: animação de loading skeleton
- `fade-in`: entrada de páginas (`page-enter`)

---

## Z-Index

| Token | Valor | Camada |
|---|---|---|
| `--z-dropdown` | 100 | Dropdowns, selects |
| `--z-sticky` | 200 | Headers sticky |
| `--z-overlay` | 300 | Overlays |
| `--z-modal` | 400 | Modais e drawers |
| `--z-toast` | 500 | Notificações toast |

---

## Espaçamento

Base: 4px (0.25rem)

| Token | Valor |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

---

## Componentes Base

### Buttons

```tsx
// Primário (ação principal)
<button className="btn-primary">Salvar</button>

// Secundário (ação alternativa)
<button className="btn-secondary">Cancelar</button>

// Destrutivo
<button className="btn-danger">Excluir</button>

// Ghost (discreta)
<button className="btn-ghost">Ver mais</button>
```

### Input

```tsx
<input className="input-field" placeholder="Digite..." />
```

### Card

```tsx
<div className="card">Conteúdo</div>
```

### Badges

```tsx
<span className="badge badge-ativo">ATIVO</span>
<span className="badge badge-inativo">INATIVO</span>
<span className="badge badge-devolvida">DEVOLVIDA</span>
<span className="badge badge-info">INFO</span>
```

### Alerts

```tsx
<div className="alert alert-success"><CheckCircle size={15}/> Operação realizada!</div>
<div className="alert alert-danger"><AlertCircle size={15}/> Ocorreu um erro.</div>
<div className="alert alert-warning"><AlertTriangle size={15}/> Atenção!</div>
```

### Skeleton

```tsx
import { Skeleton, SkeletonTable, SkeletonKpiGrid } from '@/components/feedback/Skeleton'

// Elemento único
<Skeleton width="60%" height="1rem" />

// Grade de KPIs
<SkeletonKpiGrid />

// Tabela inteira
<SkeletonTable rows={5} cols={6} />
```

### KPI Card

```tsx
import { KpiCard } from '@/components/ui/KpiCard'

<KpiCard
  label="Total Vendas"
  value="R$ 1.240,00"
  sub="12 venda(s)"
  accentColor="var(--azul)"
  icon={ShoppingCart}
  trend="up"
  trendLabel="+12%"
/>
```

### Empty State

```tsx
import { EmptyState } from '@/components/feedback/EmptyState'

<EmptyState
  icon={Package}
  title="Nenhum item encontrado"
  description="Cadastre o primeiro item clicando no botão abaixo."
  action={<button className="btn-primary">Novo Item</button>}
/>
```

---

## Dark Mode

Controlado via `next-themes` com atributo `class` na tag `<html>`.

- Ativado: `<html class="dark">`
- Toggle: componente `<ThemeToggle />` na sidebar

Para suportar dark mode em novos componentes, use sempre CSS Variables:

```css
/* ✅ Correto */
color: var(--text)
background: var(--surface)

/* ❌ Evitar */
color: #1A1A2E
background: white
```

---

## Responsive

Breakpoints (Tailwind padrão):
- `sm`: 640px
- `md`: 768px (sidebar aparece / mobile bar desaparece)
- `lg`: 1024px (layout de 3 colunas)
- `xl`: 1280px

Sidebar:
- Mobile (<md): Top bar + Drawer lateral
- Desktop (≥md): Sidebar fixa 240px
