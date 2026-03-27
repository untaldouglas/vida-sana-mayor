import { test, expect } from '@playwright/test'
import { goToDashboard, clearProfileData } from './helpers/seed'

async function goToExpediente(page: Parameters<typeof goToDashboard>[0]) {
  await page.getByRole('button', { name: /Más/ }).click()
  await page.getByRole('button', { name: /Expediente clínico/ }).click()
  await expect(page.getByRole('heading', { name: /Expediente clínico/ })).toBeVisible()
}

test.describe('CRUD Expediente clínico', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
    await clearProfileData(page)
    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
  })

  // ─── DIAGNÓSTICOS ───────────────────────────────────────────────
  test('Diagnóstico CREATE + READ + DELETE', async ({ page }) => {
    await goToExpediente(page)

    // El panel Diagnósticos viene abierto por defecto
    await page.getByRole('button', { name: '+ Añadir diagnóstico' }).click()
    await page.getByPlaceholder('Ej: Diabetes tipo 2').fill('Diabetes tipo 2')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // READ
    await expect(page.getByText('Diabetes tipo 2')).toBeVisible()

    // DELETE
    await page.getByRole('button', { name: '🗑' }).first().click()
    await expect(page.getByText('Diabetes tipo 2')).not.toBeVisible()
    await expect(page.getByText('Sin diagnósticos registrados')).toBeVisible()
  })

  test('Diagnóstico UPDATE – editar condición', async ({ page }) => {
    await goToExpediente(page)

    await page.getByRole('button', { name: '+ Añadir diagnóstico' }).click()
    await page.getByPlaceholder('Ej: Diabetes tipo 2').fill('Hipertensión')
    await page.getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Hipertensión')).toBeVisible()

    // Editar
    await page.getByRole('button', { name: '✏️' }).first().click()
    await page.getByPlaceholder('Ej: Diabetes tipo 2').fill('Hipertensión arterial')
    await page.getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Hipertensión arterial')).toBeVisible()
    await expect(page.getByText(/^Hipertensión$/)).not.toBeVisible()
  })

  // ─── ALERGIAS ───────────────────────────────────────────────────
  test('Alergia CREATE + READ + DELETE', async ({ page }) => {
    await goToExpediente(page)

    // Expandir sección Alergias
    await page.getByRole('button', { name: /Alergias/ }).click()
    await page.getByRole('button', { name: '+ Añadir alergia' }).click()

    await page.getByPlaceholder(/Penicilina/).fill('Penicilina')
    await page.getByPlaceholder(/Urticaria/).fill('Urticaria generalizada')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // READ
    await expect(page.getByText('Penicilina')).toBeVisible()
    await expect(page.getByText('Urticaria generalizada')).toBeVisible()

    // DELETE
    await page.getByRole('button', { name: '🗑' }).first().click()
    await expect(page.getByText('Penicilina')).not.toBeVisible()
  })

  // ─── VACUNAS ────────────────────────────────────────────────────
  test('Vacuna CREATE + READ + DELETE', async ({ page }) => {
    await goToExpediente(page)

    await page.getByRole('button', { name: /Vacunas/ }).click()
    await page.getByRole('button', { name: '+ Añadir vacuna' }).click()

    await page.getByPlaceholder(/COVID-19/).fill('Influenza')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // READ
    await expect(page.getByText('Influenza')).toBeVisible()

    // DELETE
    await page.getByRole('button', { name: '🗑' }).first().click()
    await expect(page.getByText('Influenza')).not.toBeVisible()
  })

  // ─── CIRUGÍAS ───────────────────────────────────────────────────
  test('Cirugía CREATE + READ + DELETE', async ({ page }) => {
    await goToExpediente(page)

    await page.getByRole('button', { name: /Cirugías/ }).click()
    await page.getByRole('button', { name: '+ Añadir cirugía' }).click()

    await page.getByPlaceholder('Ej: Apendicectomía').fill('Colecistectomía laparoscópica')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // READ
    await expect(page.getByText('Colecistectomía laparoscópica')).toBeVisible()

    // DELETE
    await page.getByRole('button', { name: '🗑' }).first().click()
    await expect(page.getByText('Colecistectomía laparoscópica')).not.toBeVisible()
  })

  // ─── ANTECEDENTES FAMILIARES ─────────────────────────────────────
  test('Antecedente familiar CREATE + READ + DELETE', async ({ page }) => {
    await goToExpediente(page)

    await page.getByRole('button', { name: /Antecedentes familiares/ }).click()
    await page.getByRole('button', { name: '+ Añadir antecedente' }).click()

    // Relación: busca el input o el selector
    await page.getByPlaceholder(/O escribe/).fill('Madre')
    await page.getByPlaceholder(/Diabetes.*Hipertensión/).fill('Diabetes')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // READ
    await expect(page.getByText('Madre')).toBeVisible()
    await expect(page.getByText('Diabetes')).toBeVisible()

    // DELETE
    await page.getByRole('button', { name: '🗑' }).first().click()
    await expect(page.getByText('Madre')).not.toBeVisible()
  })

  test('VALIDACIÓN – Guardar diagnóstico deshabilitado sin condición', async ({ page }) => {
    await goToExpediente(page)
    await page.getByRole('button', { name: '+ Añadir diagnóstico' }).click()
    await expect(page.getByRole('button', { name: /Guardar/ })).toBeDisabled()
    await page.getByPlaceholder('Ej: Diabetes tipo 2').fill('X')
    await expect(page.getByRole('button', { name: /Guardar/ })).toBeEnabled()
  })
})
