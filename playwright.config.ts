import { defineConfig, devices } from '@playwright/test'

/**
 * Config Playwright para os testes E2E do 3AJ.
 * Requer: app rodando (npm run dev) OU deixa o Playwright subir via webServer.
 * Usuário de teste: demo@3aj.com / demo123 (criado por `npm run db:seed`).
 */
export default defineConfig({
  testDir: './e2e',
  // Suíte stateful de auth com usuário demo compartilhado → execução serial
  // evita corridas de login/sessão entre workers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
