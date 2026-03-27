import { test, expect } from '@playwright/test'
import { goToDashboard, clearProfileData } from './helpers/seed'

test.describe('CRUD Medicamentos', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
    await clearProfileData(page)
    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
    await page.getByRole('button', { name: /Medicamentos/ }).first().click()
    await expect(page.locator('h1').filter({ hasText: /Medicamentos/i })).toBeVisible()
  })

  test('CREATE – añadir medicamento nuevo', async ({ page }) => {
    await page.getByRole('button', { name: '+ Añadir' }).click()
    await expect(page.getByText('Nuevo medicamento')).toBeVisible()

    await page.getByPlaceholder('Ej: Metformina').fill('Aspirina')
    await page.getByPlaceholder('Ej: 500mg').fill('100mg')
    await page.getByRole('button', { name: 'Una vez al día' }).click()
    await page.getByPlaceholder(/08:00/).fill('08:00')
    await page.getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Aspirina')).toBeVisible()
    await expect(page.getByText('100mg · Una vez al día')).toBeVisible()
  })

  test('READ – medicamento guardado aparece en la lista', async ({ page }) => {
    // Crear
    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.getByPlaceholder('Ej: Metformina').fill('Losartán')
    await page.getByPlaceholder('Ej: 500mg').fill('50mg')
    await page.getByRole('button', { name: 'Una vez al día' }).click()
    await page.getByRole('button', { name: /Guardar/ }).click()

    // Verificar lectura
    await expect(page.getByText('Medicamentos activos')).toBeVisible()
    await expect(page.getByText('Losartán')).toBeVisible()
    await expect(page.getByText('50mg · Una vez al día')).toBeVisible()
  })

  test('UPDATE – editar dosis de un medicamento', async ({ page }) => {
    // Crear base
    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.getByPlaceholder('Ej: Metformina').fill('Metformina')
    await page.getByPlaceholder('Ej: 500mg').fill('500mg')
    await page.getByRole('button', { name: 'Dos veces al día' }).click()
    await page.getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Metformina')).toBeVisible()

    // Editar
    await page.getByRole('button', { name: '✏️' }).click()
    await expect(page.getByText('Editar medicamento')).toBeVisible()
    await page.getByPlaceholder('Ej: 500mg').fill('850mg')
    await page.getByRole('button', { name: /Guardar/ }).click()

    // Verificar actualización
    await expect(page.getByText('850mg · Dos veces al día')).toBeVisible()
    await expect(page.getByText('500mg · Dos veces al día')).not.toBeVisible()
  })

  test('DELETE – eliminar medicamento de la lista', async ({ page }) => {
    // Crear
    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.getByPlaceholder('Ej: Metformina').fill('Ibuprofeno')
    await page.getByPlaceholder('Ej: 500mg').fill('400mg')
    await page.getByRole('button', { name: 'Según necesidad' }).click()
    await page.getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Ibuprofeno')).toBeVisible()

    // Eliminar
    await page.getByRole('button', { name: '🗑' }).click()

    // Verificar eliminación
    await expect(page.getByText('Ibuprofeno')).not.toBeVisible()
    await expect(page.getByText('No hay medicamentos registrados')).toBeVisible()
  })

  test('VALIDACIÓN – botón Guardar deshabilitado sin nombre o dosis', async ({ page }) => {
    await page.getByRole('button', { name: '+ Añadir' }).click()
    const guardar = page.getByRole('button', { name: /Guardar/ })
    await expect(guardar).toBeDisabled()

    await page.getByPlaceholder('Ej: Metformina').fill('Test')
    await expect(guardar).toBeDisabled() // falta dosis (frecuencia es opcional)

    await page.getByPlaceholder('Ej: 500mg').fill('10mg')
    await expect(guardar).toBeEnabled() // nombre + dosis es suficiente
  })

  test('TOMAR – registrar toma diaria de un medicamento', async ({ page }) => {
    // Crear medicamento
    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.getByPlaceholder('Ej: Metformina').fill('Omeprazol')
    await page.getByPlaceholder('Ej: 500mg').fill('20mg')
    await page.getByRole('button', { name: 'Una vez al día' }).click()
    await page.getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Omeprazol')).toBeVisible()

    // Registrar toma
    await page.getByRole('button', { name: /Ya la tomé/ }).click()

    // El botón desaparece y aparece confirmación
    await expect(page.getByRole('button', { name: /Ya la tomé/ })).not.toBeVisible()
    await expect(page.getByText('¡Toma registrada hoy!')).toBeVisible()
  })
})
