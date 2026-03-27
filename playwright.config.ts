import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,   // IndexedDB por contexto – serial para evitar colisiones
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173/vida-sana-mayor/',
    headless: true,
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
