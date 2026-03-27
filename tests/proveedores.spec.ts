import { test, expect } from '@playwright/test'
import { goToDashboard, clearProfileData } from './helpers/seed'

async function goToProveedores(page: Parameters<typeof goToDashboard>[0]) {
  await page.getByRole('button', { name: /Más/ }).click()
  await page.getByRole('button', { name: /Proveedores de salud/ }).click()
  // Usar h1 del banner para evitar conflicto con h2 en main
  await expect(page.locator('h1').filter({ hasText: /proveedores/ })).toBeVisible()
}

test.describe('CRUD Proveedores de salud', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
    await clearProfileData(page)
    await page.reload()
    await page.waitForSelector('text=Hola, Tester')
  })

  test('CREATE – añadir un proveedor de salud tipo Hospital', async ({ page }) => {
    await goToProveedores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await expect(page.locator('.modal-box').filter({ hasText: /Nombre del proveedor/ })).toBeVisible()

    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Hospital General del Norte')

    // Seleccionar tipo Hospital (el botón contiene "Hospital" como texto)
    await page.locator('.modal-box').locator('button').filter({ hasText: 'Hospital' }).first().click()
    await page.locator('.modal-box').getByPlaceholder(/Calle.*número/).fill('Av. Insurgentes 1500')
    await page.locator('.modal-box').getByPlaceholder('55 1234 5678').fill('55 3333 4444')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Hospital General del Norte')).toBeVisible()
  })

  test('READ – proveedor visible con teléfono correcto', async ({ page }) => {
    await goToProveedores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Laboratorio Central')
    await page.locator('.modal-box').locator('button').filter({ hasText: /Laboratorio/ }).first().click()
    await page.locator('.modal-box').getByPlaceholder('55 1234 5678').fill('55 7777 8888')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Laboratorio Central')).toBeVisible()
    await expect(page.getByText('55 7777 8888')).toBeVisible()
  })

  test('UPDATE – editar nombre de un proveedor', async ({ page }) => {
    await goToProveedores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Clínica Original')
    await page.locator('.modal-box').locator('button').filter({ hasText: /Clínica/ }).first().click()
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Clínica Original')).toBeVisible()

    // Editar
    await page.getByRole('button', { name: '✏️' }).first().click()
    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Clínica Actualizada')
    await page.locator('.modal-box').getByPlaceholder(/Calle.*número/).fill('Calle Nueva 100')
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    await expect(page.getByText('Clínica Actualizada')).toBeVisible()
    await expect(page.getByText('Clínica Original')).not.toBeVisible()
  })

  test('DELETE – eliminar un proveedor de la lista', async ({ page }) => {
    await goToProveedores(page)

    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Farmacia a Borrar')
    await page.locator('.modal-box').locator('button').filter({ hasText: 'Farmacia' }).first().click()
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Farmacia a Borrar')).toBeVisible()

    await page.getByRole('button', { name: '🗑' }).first().click()

    await expect(page.getByText('Farmacia a Borrar')).not.toBeVisible()
    await expect(page.getByText('No hay proveedores registrados')).toBeVisible()
  })

  test('VALIDACIÓN – Guardar deshabilitado sin nombre', async ({ page }) => {
    await goToProveedores(page)
    await page.getByRole('button', { name: '+ Añadir' }).click()
    const guardar = page.locator('.modal-box').getByRole('button', { name: /Guardar/ })
    await expect(guardar).toBeDisabled()

    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Test Proveedor')
    // Seleccionar tipo también requerido
    await page.locator('.modal-box').locator('button').filter({ hasText: 'Hospital' }).first().click()
    await expect(guardar).toBeEnabled()
  })

  test('FILTRO – filtrar proveedores por categoría', async ({ page }) => {
    await goToProveedores(page)

    // Crear un hospital
    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Hospital Test')
    await page.locator('.modal-box').locator('button').filter({ hasText: 'Hospital' }).first().click()
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()
    await expect(page.getByText('Hospital Test')).toBeVisible()

    // Filtro Todos (1)
    await expect(page.getByRole('button', { name: /Todos \(1\)/ })).toBeVisible()

    // Filtro Hospital (1): debe mostrar el proveedor
    await page.getByRole('button', { name: /🏥 Hospital \(1\)/ }).click()
    await expect(page.getByText('Hospital Test')).toBeVisible()

    // Volver a Todos – los botones de categoría con count=0 no se renderizan
    // (comportamiento esperado de la app: oculta categorías vacías)
    await page.getByRole('button', { name: /Todos \(1\)/ }).click()
    await expect(page.getByText('Hospital Test')).toBeVisible()

    // Crear una farmacia para verificar multi-categoría
    await page.getByRole('button', { name: '+ Añadir' }).click()
    await page.locator('.modal-box').getByPlaceholder('Ej: Hospital Ángeles Lomas').fill('Farmacia Test')
    await page.locator('.modal-box').locator('button').filter({ hasText: 'Farmacia' }).first().click()
    await page.locator('.modal-box').getByRole('button', { name: /Guardar/ }).click()

    // Filtrar por Hospital (1): NO debe mostrar Farmacia
    await page.getByRole('button', { name: /🏥 Hospital \(1\)/ }).click()
    await expect(page.getByText('Hospital Test')).toBeVisible()
    await expect(page.getByText('Farmacia Test')).not.toBeVisible()

    // Filtrar por Farmacia (1): NO debe mostrar Hospital
    await page.getByRole('button', { name: /Farmacia \(1\)/ }).click()
    await expect(page.getByText('Farmacia Test')).toBeVisible()
    await expect(page.getByText('Hospital Test')).not.toBeVisible()
  })
})
