import type { Page } from '@playwright/test'

export const PROFILE_ID = 'test-profile-playwright'

export const APP_STATE = {
  profiles: [{
    id: PROFILE_ID,
    name: 'Tester',
    relation: 'yo',
    isPrimary: true,
    avatar: '👤',
    createdAt: '2026-01-01T00:00:00.000Z',
  }],
  activeProfileId: PROFILE_ID,
  onboardingDone: true,
  agreementAccepted: true,
  pinHash: null,
  authMethod: 'none',
  encryptionKey: null,
  aiConfig: null,
}

type StorageWindow = Window & { __vsm_storage?: { saveAppState: (s: unknown) => Promise<void>; deleteProfile: (id: string) => Promise<void> } }

/**
 * Navega a la app, espera que SQLite se inicialice completamente,
 * inyecta el AppState de prueba y recarga hasta llegar al dashboard.
 */
export async function goToDashboard(page: Page) {
  await page.goto('/')

  // Esperar que React monte y SQLite se inicialice:
  // el splash desaparece cuando loadAppState() termina de leer la BD.
  await page.waitForSelector('text=Cargando', { state: 'hidden', timeout: 30_000 })

  // En este punto main.tsx ya ejecutó el import estático y __vsm_storage está disponible.
  await page.evaluate(async (state) => {
    const storage = (window as StorageWindow).__vsm_storage
    if (!storage) throw new Error('__vsm_storage no disponible en window')
    await storage.saveAppState(state)
  }, APP_STATE)

  // Recargar: la app lee el estado sembrado desde SQLite
  await page.reload()
  await page.waitForSelector('text=Hola, Tester', { timeout: 30_000 })
}

/**
 * Limpia todos los datos del perfil de prueba:
 * elimina el perfil (CASCADE borra todo) y lo vuelve a crear limpio.
 */
export async function clearProfileData(page: Page) {
  await page.evaluate(async (profileId) => {
    const storage = (window as StorageWindow).__vsm_storage
    if (!storage) throw new Error('__vsm_storage no disponible en window')
    await storage.deleteProfile(profileId)
  }, PROFILE_ID)

  await page.evaluate(async (state) => {
    const storage = (window as StorageWindow).__vsm_storage!
    await storage.saveAppState(state)
  }, APP_STATE)
}
