import { test, expect } from '@playwright/test'

const DEMO = { email: 'demo@3aj.com', password: 'demo123' }

// Faz login antes de cada teste de navegação.
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder(/email/i).fill(DEMO.email)
  await page.locator('input[type="password"]').fill(DEMO.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
})

const ROTAS = [
  { href: '/materia-prima', titulo: /matéria-prima/i },
  { href: '/equipamentos', titulo: /equipamentos/i },
  { href: '/pecas', titulo: /peças/i },
  { href: '/montagem', titulo: /montagem/i },
  { href: '/produtos', titulo: /produtos/i },
  { href: '/vendas', titulo: /vendas/i },
  { href: '/descartes', titulo: /descartes/i },
]

test.describe('Navegação autenticada', () => {
  for (const rota of ROTAS) {
    test(`acessa ${rota.href} sem erro`, async ({ page }) => {
      await page.goto(rota.href)
      await expect(page).toHaveURL(new RegExp(rota.href))
      // a página não deve redirecionar para login
      await expect(page).not.toHaveURL(/\/login/)
    })
  }

  test('dashboard mostra os KPIs principais', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/receita total/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/lucro líquido/i)).toBeVisible()
    await expect(page.getByText(/margem de lucro/i)).toBeVisible()
  })
})
