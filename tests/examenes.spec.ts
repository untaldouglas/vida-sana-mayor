import { test, expect } from '@playwright/test'
import { goToDashboard, clearProfileData } from './helpers/seed'

const TODAY = new Date().toISOString().split('T')[0]

async function goToExamenes(page: Parameters<typeof goToDashboard>[0]) {
  await page.getByRole('button', { name: /Más/ }).click()
  await page.getByRole('button', { name: /Exámenes médicos/ }).click()
  // Esperar h1 del banner (evita conflicto con h2 en main)
  await expect(page.locator('h1').filter({ hasText: /Exámenes/ })).toBeVisible()
}

test.describe('CRUD Exámenes médicos', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
    await clearProfileData(page)
    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
  })

  test('CREATE – añadir examen de laboratorio', async ({ page }) => {
    await goToExamenes(page)
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await expect(page.locator('.modal-box').filter({ hasText: 'Nuevo examen' })).toBeVisible()

    // Categoría Laboratorio ya está seleccionada por defecto
    // Seleccionar tipo específico dentro del modal
    await page.locator('.modal-box').getByRole('button', { name: 'Glucosa en ayuno' }).click()
    await page.locator('.modal-box').locator('input[type="date"]').first().fill(TODAY)
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Glucosa en ayuno')).toBeVisible()
  })

  test('CREATE – añadir examen de radiología', async ({ page }) => {
    await goToExamenes(page)
    await page.getByRole('button', { name: '+ Nuevo' }).click()

    // Cambiar a Radiología dentro del modal
    await page.locator('.modal-box').locator('button').filter({ hasText: 'Radiología' }).click()
    await page.locator('.modal-box').getByRole('button', { name: 'Rayos X de tórax' }).click()
    await page.locator('.modal-box').locator('input[type="date"]').first().fill(TODAY)
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    // Filtrar por Radiología en la lista
    await page.getByRole('button', { name: /Radiología/ }).first().click()
    await expect(page.getByText('Rayos X de tórax')).toBeVisible()
  })

  test('READ – filtros por categoría funcionan', async ({ page }) => {
    await goToExamenes(page)

    // Crear examen laboratorio
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.locator('.modal-box').getByRole('button', { name: 'Glucosa en ayuno' }).click()
    await page.locator('.modal-box').locator('input[type="date"]').first().fill(TODAY)
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    // Verificar filtro Todos (1)
    await expect(page.getByRole('button', { name: /Todos \(1\)/ })).toBeVisible()

    // Filtro Lab (1)
    await page.getByRole('button', { name: /Lab \(1\)/ }).click()
    await expect(page.getByText('Glucosa en ayuno')).toBeVisible()

    // Filtro Radiología (0)
    await page.getByRole('button', { name: /Radiología \(0\)/ }).click()
    await expect(page.getByText('Glucosa en ayuno')).not.toBeVisible()
  })

  test('UPDATE – editar notas de un examen', async ({ page }) => {
    await goToExamenes(page)

    // Crear
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.locator('.modal-box').getByRole('button', { name: 'Hemograma completo' }).click()
    await page.locator('.modal-box').locator('input[type="date"]').first().fill(TODAY)
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Hemograma completo')).toBeVisible()

    // Editar
    await page.getByRole('button', { name: '✏️' }).first().click()
    await expect(page.locator('.modal-box').filter({ hasText: 'Editar examen' })).toBeVisible()
    await page.locator('.modal-box').getByPlaceholder(/Observaciones/).fill('Resultado dentro del rango normal')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    // Verificar en la lista (no en el modal que ya cerró)
    await expect(page.locator('li').filter({ hasText: 'Hemograma completo' })).toBeVisible()
  })

  test('DELETE – eliminar un examen médico', async ({ page }) => {
    await goToExamenes(page)

    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.locator('.modal-box').getByRole('button', { name: 'Función renal (BUN/Creatinina)' }).click()
    await page.locator('.modal-box').locator('input[type="date"]').first().fill(TODAY)
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Función renal (BUN/Creatinina)')).toBeVisible()

    await page.getByRole('button', { name: '🗑' }).first().click()

    await expect(page.getByText('Función renal (BUN/Creatinina)')).not.toBeVisible()
    await expect(page.getByText('No hay exámenes registrados')).toBeVisible()
  })

  test('VALIDACIÓN – Guardar deshabilitado sin tipo de examen', async ({ page }) => {
    await goToExamenes(page)
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.locator('.modal-box').locator('input[type="date"]').first().fill(TODAY)
    // Sin seleccionar tipo específico
    await expect(page.locator('.modal-box').getByRole('button', { name: /Guardar/ })).toBeDisabled()

    await page.locator('.modal-box').getByRole('button', { name: 'Glucosa en ayuno' }).click()
    await expect(page.locator('.modal-box').getByRole('button', { name: /Guardar/ })).toBeEnabled()
  })
})
