import { test, expect } from '@playwright/test'
import { goToDashboard, clearProfileData, PROFILE_ID } from './helpers/seed'

type StorageWindow = Window & {
  __vsm_storage?: {
    saveSymptom: (entry: unknown) => Promise<void>
  }
}

test.describe('CRUD Síntomas', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
    await clearProfileData(page)
    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
    await page.getByRole('button', { name: /Síntomas/ }).first().click()
    await expect(page.getByRole('heading', { name: /Diario de síntomas/ })).toBeVisible()
  })

  test('CREATE – registrar síntoma con dolor moderado y tags', async ({ page }) => {
    await page.getByRole('button', { name: '+ Registrar' }).click()
    await expect(page.getByText('Registrar síntoma')).toBeVisible()

    // Seleccionar nivel de dolor
    await page.getByRole('button', { name: /Moderado/ }).click()

    // Seleccionar tags
    await page.getByRole('button', { name: 'Cansancio' }).click()
    await page.getByRole('button', { name: 'Fiebre' }).click()

    // Descripción
    await page.getByPlaceholder(/Describe cómo/).fill('Cansancio y fiebre desde la mañana')

    // Guardar
    await page.getByRole('button', { name: /Guardar/ }).click()

    // El formulario debe cerrarse y el síntoma aparecer en la lista
    await expect(page.getByText('Registrar síntoma')).not.toBeVisible()
    await expect(page.getByText('Cansancio y fiebre desde la mañana')).toBeVisible()
  })

  test('READ – síntomas guardados aparecen en lista (vía storage)', async ({ page }) => {
    await page.evaluate(async (profileId) => {
      const storage = (window as StorageWindow).__vsm_storage
      if (!storage) throw new Error('__vsm_storage no disponible')
      await storage.saveSymptom({
        id: 'test-sym-001',
        profileId,
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        painLevel: 1,
        description: 'Dolor leve de cabeza',
        tags: [],
      })
    }, PROFILE_ID)

    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
    await page.getByRole('button', { name: /Síntomas/ }).first().click()

    await expect(page.getByText('Dolor leve de cabeza')).toBeVisible()
    await expect(page.getByText(/Leve/)).toBeVisible()
  })

  test('DELETE – eliminar un síntoma de la lista', async ({ page }) => {
    await page.evaluate(async (profileId) => {
      const storage = (window as StorageWindow).__vsm_storage
      if (!storage) throw new Error('__vsm_storage no disponible')
      await storage.saveSymptom({
        id: 'test-sym-002',
        profileId,
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        painLevel: 0,
        description: 'Sin dolor hoy',
        tags: [],
      })
    }, PROFILE_ID)

    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
    await page.getByRole('button', { name: /Síntomas/ }).first().click()
    await expect(page.getByText('Sin dolor hoy')).toBeVisible()

    // Eliminar
    await page.getByRole('button', { name: '🗑' }).click()

    await expect(page.getByText('Sin dolor hoy')).not.toBeVisible()
    await expect(page.getByText(/no hay síntomas/i)).toBeVisible()
  })

  test('VALIDACIÓN – se puede guardar sin descripción (solo nivel de dolor)', async ({ page }) => {
    await page.getByRole('button', { name: '+ Registrar' }).click()
    // El botón Guardar debe estar habilitado desde el inicio (nivel 0 es válido)
    await expect(page.getByRole('button', { name: /Guardar/ })).toBeEnabled()
  })
})
