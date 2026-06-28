import { test, expect } from '@playwright/test'

const DEMO = { email: 'demo@3aj.com', password: 'demo123' }

test.describe('Autenticação', () => {
  test('rota protegida redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login com credenciais válidas leva ao dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(DEMO.email)
    await page.locator('input[type="password"]').fill(DEMO.password)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('login com senha errada mostra erro e permanece em /login', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(DEMO.email)
    await page.locator('input[type="password"]').fill('senha-errada')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page.getByText(/incorret/i)).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout retorna para /login', async ({ page }) => {
    // login
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(DEMO.email)
    await page.locator('input[type="password"]').fill(DEMO.password)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // logout (botão de sair na sidebar/footer)
    await page.getByRole('button', { name: /sair/i }).first().click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
