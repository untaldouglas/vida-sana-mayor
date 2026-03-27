import { test, expect } from '@playwright/test'
import { goToDashboard, clearProfileData } from './helpers/seed'

const TODAY = new Date().toISOString().split('T')[0]
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]

test.describe('CRUD Agenda (citas médicas)', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
    await clearProfileData(page)
    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
    await page.getByRole('button', { name: /Agenda/ }).first().click()
    await expect(page.getByRole('heading', { name: /Agenda médica/ })).toBeVisible()
  })

  test('CREATE – añadir cita médica', async ({ page }) => {
    await page.getByRole('button', { name: '+ Añadir cita' }).click()
    await expect(page.getByText(/Motivo.*cita/)).toBeVisible()

    await page.getByPlaceholder(/Revisión general/).fill('Control diabetes')
    await page.locator('input[type="date"]').first().fill(TOMORROW)
    await page.locator('input[type="time"]').fill('10:30')
    await page.getByPlaceholder(/Dr\. López/).fill('Dr. García')
    await page.getByPlaceholder(/Hospital General/).fill('Clínica Norte')

    await page.getByRole('button', { name: /Guardar/ }).click()

    // La cita aparece en la vista (puede estar en "Todas" si TOMORROW no está en la semana actual)
    await page.getByRole('button', { name: /Todas/ }).click()
    await expect(page.getByText('Control diabetes')).toBeVisible()
    await expect(page.getByText('Dr. García')).toBeVisible()
  })

  test('READ – cita creada visible en vista semana y todas', async ({ page }) => {
    await page.getByRole('button', { name: '+ Añadir cita' }).click()
    await page.getByPlaceholder(/Revisión general/).fill('Revisión anual')
    await page.locator('input[type="date"]').first().fill(TODAY)
    await page.locator('input[type="time"]').fill('09:00')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // Vista Semana (hoy debe aparecer con ⭐)
    await expect(page.getByText('Revisión anual')).toBeVisible()

    // Vista Todas
    await page.getByRole('button', { name: /Todas/ }).click()
    await expect(page.getByText('Revisión anual')).toBeVisible()

    // Vista Próximas
    await page.getByRole('button', { name: /Próximas/ }).click()
    await expect(page.getByText('Revisión anual')).toBeVisible()
  })

  test('UPDATE – editar motivo de una cita (desde vista Próximas)', async ({ page }) => {
    // Crear cita
    await page.getByRole('button', { name: '+ Añadir cita' }).click()
    await page.getByPlaceholder(/Revisión general/).fill('Consulta inicial')
    await page.locator('input[type="date"]').first().fill(TODAY)
    await page.locator('input[type="time"]').fill('08:00')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // El botón ✏️ solo existe en vista "Próximas" o "Todas"
    await page.getByRole('button', { name: /Próximas/ }).click()
    await expect(page.getByText('Consulta inicial')).toBeVisible()

    // Editar
    await page.getByRole('button', { name: '✏️' }).click()
    await page.getByPlaceholder(/Revisión general/).fill('Consulta de seguimiento')
    await page.locator('input[type="time"]').fill('11:00')
    await page.getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Consulta de seguimiento')).toBeVisible()
    await expect(page.getByText('Consulta inicial')).not.toBeVisible()
  })

  test('DELETE – eliminar una cita médica', async ({ page }) => {
    await page.getByRole('button', { name: '+ Añadir cita' }).click()
    await page.getByPlaceholder(/Revisión general/).fill('Cita a eliminar')
    await page.locator('input[type="date"]').first().fill(TODAY)
    await page.locator('input[type="time"]').fill('07:00')
    await page.getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Cita a eliminar')).toBeVisible()

    await page.getByRole('button', { name: '🗑' }).click()

    await expect(page.getByText('Cita a eliminar')).not.toBeVisible()
  })

  test('VALIDACIÓN – Guardar deshabilitado sin motivo, fecha u hora', async ({ page }) => {
    await page.getByRole('button', { name: '+ Añadir cita' }).click()
    const guardar = page.getByRole('button', { name: /Guardar/ })
    await expect(guardar).toBeDisabled()

    await page.getByPlaceholder(/Revisión general/).fill('Test')
    await expect(guardar).toBeDisabled()

    await page.locator('input[type="date"]').first().fill(TODAY)
    await expect(guardar).toBeDisabled()

    await page.locator('input[type="time"]').fill('12:00')
    await expect(guardar).toBeEnabled()
  })
})
