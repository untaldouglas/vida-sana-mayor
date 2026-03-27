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

/**
 * Navega a la app, espera que la DB se inicialice, inyecta el AppState de prueba
 * y recarga la página hasta llegar al dashboard.
 */
export async function goToDashboard(page: Page) {
  // Primera carga – dispara la creación del schema de IndexedDB
  await page.goto('/')
  await page.waitForSelector('text=Cargando', { state: 'hidden', timeout: 10_000 })

  // Sembrar appState
  await page.evaluate((state) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('vida-sana-mayor')
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        const tx = db.transaction('appState', 'readwrite')
        tx.objectStore('appState').put(state, 'main')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(new Error('Seed DB: put appState falló'))
      }
      req.onerror = () => reject(new Error('Seed DB: no se pudo abrir IndexedDB'))
    })
  }, APP_STATE)

  // Recarga: la app lee el estado sembrado y muestra el dashboard
  await page.reload()
  await page.waitForSelector('text=Hola, Tester', { timeout: 10_000 })
}

/**
 * Limpia todos los datos del perfil de prueba entre tests.
 */
export async function clearProfileData(page: Page) {
  await page.evaluate((profileId) => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.open('vida-sana-mayor')
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        const stores = [
          'symptoms', 'appointments', 'doctors', 'medicalExams',
          'serviceProviders', 'media', 'ratings', 'progress',
        ]
        const available = stores.filter(s => db.objectStoreNames.contains(s))
        const tx = db.transaction(available, 'readwrite')

        let pending = available.length
        if (pending === 0) { resolve(); return }

        available.forEach(storeName => {
          const store = tx.objectStore(storeName)
          const hasIndex = store.indexNames.contains('profileId')
          if (hasIndex) {
            const req = store.index('profileId').getAllKeys(profileId)
            req.onsuccess = () => {
              (req.result as IDBValidKey[]).forEach(k => store.delete(k))
              if (--pending === 0) resolve()
            }
          } else {
            // progress usa profileId como key directamente
            store.delete(profileId)
            if (--pending === 0) resolve()
          }
        })
      }
      req.onerror = () => resolve()
    })
  }, PROFILE_ID)
}
