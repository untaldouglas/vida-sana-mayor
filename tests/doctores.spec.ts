import { test, expect } from '@playwright/test'
import { goToDashboard, clearProfileData } from './helpers/seed'

async function goToDoctores(page: Parameters<typeof goToDashboard>[0]) {
  await page.getByRole('button', { name: /Más/ }).click()
  await page.getByRole('button', { name: /Mis doctores/ }).click()
  // Usar h1 del banner para evitar conflicto con h2 en main
  await expect(page.locator('h1').filter({ hasText: /doctores/i })).toBeVisible()
}

test.describe('CRUD Doctores', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
    await clearProfileData(page)
    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
  })

  test('CREATE – añadir un doctor', async ({ page }) => {
    await goToDoctores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await expect(page.locator('.modal-box').filter({ hasText: /Nombre del doctor/ })).toBeVisible()

    await page.locator('.modal-box').getByPlaceholder('Ej: López Martínez').fill('García Ramírez')
    await page.locator('.modal-box').getByPlaceholder(/55 1234/).fill('55 9876 5432')
    await page.locator('.modal-box').getByPlaceholder(/Horarios/).fill('Muy puntual y amable')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('García Ramírez')).toBeVisible()
  })

  test('READ – doctor creado aparece con datos correctos', async ({ page }) => {
    await goToDoctores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: López Martínez').fill('Pérez Torres')
    await page.locator('.modal-box').getByPlaceholder(/55 1234/).fill('55 1111 2222')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Pérez Torres')).toBeVisible()
    await expect(page.getByText('55 1111 2222')).toBeVisible()
  })

  test('UPDATE – editar nombre y teléfono de un doctor', async ({ page }) => {
    await goToDoctores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: López Martínez').fill('Dr. Original')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Dr. Original')).toBeVisible()

    // Editar
    await page.getByRole('button', { name: '✏️' }).first().click()
    await page.locator('.modal-box').getByPlaceholder('Ej: López Martínez').fill('Dr. Actualizado')
    await page.locator('.modal-box').getByPlaceholder(/55 1234/).fill('55 0000 9999')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Dr. Actualizado')).toBeVisible()
    await expect(page.getByText('Dr. Original')).not.toBeVisible()
    await expect(page.getByText('55 0000 9999')).toBeVisible()
  })

  test('DELETE – eliminar un doctor de la lista', async ({ page }) => {
    await goToDoctores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: López Martínez').fill('Doctor a Borrar')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Doctor a Borrar')).toBeVisible()

    await page.getByRole('button', { name: '🗑' }).first().click()

    await expect(page.getByText('Doctor a Borrar')).not.toBeVisible()
  })

  test('VALIDACIÓN – Guardar deshabilitado sin nombre', async ({ page }) => {
    await goToDoctores(page)
    await page.getByRole('button', { name: '+ Añadir' }).click()
    const guardar = page.locator('.modal-box').getByRole('button', { name: /Guardar/ })
    await expect(guardar).toBeDisabled()

    await page.locator('.modal-box').getByPlaceholder('Ej: López Martínez').fill('Dr. Test')
    await expect(guardar).toBeEnabled()
  })

  test('CREATE – doctor con especialidad seleccionada', async ({ page }) => {
    await goToDoctores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: López Martínez').fill('Especialista Prueba')
    await page.locator('.modal-box').locator('select').selectOption({ index: 2 })
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Especialista Prueba')).toBeVisible()
  })
})
