// ============================================================
// storage.ts – IndexedDB + AES-256 encryption
// Vida Sana Mayor - 100% offline, 100% privado
// ============================================================

import { openDB, IDBPDatabase } from 'idb'
import type {
  AppState, Profile, MedicalRecord, Doctor, Appointment,
  SymptomEntry, ProgressRecord, MediaFile, ShareToken,
  MedicalExam, ServiceProvider, Rating
} from './types'

const DB_NAME = 'vida-sana-mayor'
const DB_VERSION = 2

// --------------- Cifrado AES-256-GCM ---------------

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(data)
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(dec)
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  // Derivar clave EXTRACTABLE para poder exportarla como hash
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // extractable para poder exportar
    ['encrypt', 'decrypt']
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  const hashBytes = new Uint8Array(exported)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

// --------------- Base de datos IndexedDB ---------------

let _db: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState')
      }
      if (!db.objectStoreNames.contains('medicalRecords')) {
        db.createObjectStore('medicalRecords', { keyPath: 'profileId' })
      }
      if (!db.objectStoreNames.contains('doctors')) {
        const doctorStore = db.createObjectStore('doctors', { keyPath: 'id' })
        doctorStore.createIndex('profileId', 'profileId')
      }
      if (!db.objectStoreNames.contains('appointments')) {
        const apptStore = db.createObjectStore('appointments', { keyPath: 'id' })
        apptStore.createIndex('profileId', 'profileId')
        apptStore.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains('symptoms')) {
        const sympStore = db.createObjectStore('symptoms', { keyPath: 'id' })
        sympStore.createIndex('profileId', 'profileId')
        sympStore.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'profileId' })
      }
      if (!db.objectStoreNames.contains('media')) {
        const mediaStore = db.createObjectStore('media', { keyPath: 'id' })
        mediaStore.createIndex('profileId', 'profileId')
      }
      if (!db.objectStoreNames.contains('shareTokens')) {
        db.createObjectStore('shareTokens', { keyPath: 'token' })
      }
      // v2: Exámenes médicos y proveedores de servicio
      if (!db.objectStoreNames.contains('medicalExams')) {
        const examStore = db.createObjectStore('medicalExams', { keyPath: 'id' })
        examStore.createIndex('profileId', 'profileId')
        examStore.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains('serviceProviders')) {
        const provStore = db.createObjectStore('serviceProviders', { keyPath: 'id' })
        provStore.createIndex('profileId', 'profileId')
      }
      if (!db.objectStoreNames.contains('ratings')) {
        const ratStore = db.createObjectStore('ratings', { keyPath: 'id' })
        ratStore.createIndex('profileId', 'profileId')
        ratStore.createIndex('entityId', 'entityId')
      }
    }
  })
  return _db
}

// --------------- AppState ---------------

export async function loadAppState(): Promise<AppState | null> {
  const db = await getDB()
  return db.get('appState', 'main') ?? null
}

export async function saveAppState(state: AppState): Promise<void> {
  const db = await getDB()
  await db.put('appState', state, 'main')
}

// --------------- Perfiles ---------------

export async function getProfiles(): Promise<Profile[]> {
  const state = await loadAppState()
  return state?.profiles ?? []
}

export async function saveProfile(profile: Profile): Promise<void> {
  const state = await loadAppState()
  if (!state) return
  const idx = state.profiles.findIndex(p => p.id === profile.id)
  if (idx >= 0) state.profiles[idx] = profile
  else state.profiles.push(profile)
  await saveAppState(state)
}

export async function deleteProfile(profileId: string): Promise<void> {
  const db = await getDB()
  const state = await loadAppState()
  if (!state) return
  state.profiles = state.profiles.filter(p => p.id !== profileId)
  await saveAppState(state)
  await db.delete('medicalRecords', profileId)
  // Borrar appointments, symptoms, media, doctors de este perfil
  const appts = await db.getAllFromIndex('appointments', 'profileId', profileId)
  for (const a of appts) await db.delete('appointments', a.id)
  const symps = await db.getAllFromIndex('symptoms', 'profileId', profileId)
  for (const s of symps) await db.delete('symptoms', s.id)
  const medias = await db.getAllFromIndex('media', 'profileId', profileId)
  for (const m of medias) await db.delete('media', m.id)
  const exams = await db.getAllFromIndex('medicalExams', 'profileId', profileId)
  for (const e of exams) await db.delete('medicalExams', e.id)
  const providers = await db.getAllFromIndex('serviceProviders', 'profileId', profileId)
  for (const p of providers) await db.delete('serviceProviders', p.id)
  const ratings = await db.getAllFromIndex('ratings', 'profileId', profileId)
  for (const r of ratings) await db.delete('ratings', r.id)
}

// --------------- Expediente clínico ---------------

export async function getMedicalRecord(profileId: string): Promise<MedicalRecord> {
  const db = await getDB()
  const record = await db.get('medicalRecords', profileId)
  return record ?? {
    profileId,
    allergies: [],
    vaccines: [],
    diagnoses: [],
    medications: [],
    consultations: [],
    labResults: [],
    surgeries: [],
    familyHistory: []
  }
}

export async function saveMedicalRecord(record: MedicalRecord): Promise<void> {
  const db = await getDB()
  await db.put('medicalRecords', record)
}

// --------------- Doctores ---------------

export async function getDoctors(profileId: string): Promise<Doctor[]> {
  const db = await getDB()
  return db.getAllFromIndex('doctors', 'profileId', profileId)
}

export async function saveDoctor(doctor: Doctor & { profileId: string }): Promise<void> {
  const db = await getDB()
  await db.put('doctors', doctor)
}

export async function deleteDoctor(doctorId: string): Promise<void> {
  const db = await getDB()
  await db.delete('doctors', doctorId)
}

// --------------- Citas ---------------

export async function getAppointments(profileId: string): Promise<Appointment[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('appointments', 'profileId', profileId)
  return all.sort((a, b) => a.date.localeCompare(b.date))
}

export async function saveAppointment(appt: Appointment & { profileId: string }): Promise<void> {
  const db = await getDB()
  await db.put('appointments', appt)
}

export async function deleteAppointment(apptId: string): Promise<void> {
  const db = await getDB()
  await db.delete('appointments', apptId)
}

// --------------- Síntomas ---------------

export async function getSymptoms(profileId: string): Promise<SymptomEntry[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('symptoms', 'profileId', profileId)
  return all.sort((a, b) => b.date.localeCompare(a.date))
}

export async function saveSymptom(entry: SymptomEntry): Promise<void> {
  const db = await getDB()
  await db.put('symptoms', entry)
}

export async function deleteSymptom(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('symptoms', id)
}

// --------------- Progreso ---------------

export async function getProgress(profileId: string): Promise<ProgressRecord> {
  const db = await getDB()
  return db.get('progress', profileId) ?? {
    profileId, streak: 0, totalEntries: 0,
    lastEntryDate: '', suns: 0, messages: []
  }
}

export async function updateProgress(profileId: string): Promise<ProgressRecord> {
  const db = await getDB()
  let progress = await getProgress(profileId)

  // Guardia defensiva: garantiza objeto válido ante cualquier fallo de idb
  if (!progress || typeof progress.lastEntryDate !== 'string') {
    progress = { profileId, streak: 0, totalEntries: 0, lastEntryDate: '', suns: 0, messages: [] }
  }

  const today = new Date().toISOString().split('T')[0]
  if (progress.lastEntryDate !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    progress.streak = progress.lastEntryDate === yesterday ? progress.streak + 1 : 1
    progress.lastEntryDate = today
    progress.totalEntries++
    progress.suns = Math.floor(progress.totalEntries / 3)
  }
  await db.put('progress', progress)
  return progress
}

// --------------- Media (audio, foto, scan) ---------------

export async function saveMedia(file: MediaFile): Promise<void> {
  const db = await getDB()
  await db.put('media', file)
}

export async function getMedia(id: string): Promise<MediaFile | undefined> {
  const db = await getDB()
  return db.get('media', id)
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('media', id)
}

// --------------- Exámenes médicos ---------------

export async function getMedicalExams(profileId: string): Promise<MedicalExam[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('medicalExams', 'profileId', profileId)
  return all.sort((a, b) => b.date.localeCompare(a.date))
}

export async function saveMedicalExam(exam: MedicalExam): Promise<void> {
  const db = await getDB()
  await db.put('medicalExams', exam)
}

export async function deleteMedicalExam(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('medicalExams', id)
}

// --------------- Proveedores de servicio ---------------

export async function getServiceProviders(profileId: string): Promise<ServiceProvider[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('serviceProviders', 'profileId', profileId)
  return all.sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveServiceProvider(provider: ServiceProvider): Promise<void> {
  const db = await getDB()
  await db.put('serviceProviders', provider)
}

export async function deleteServiceProvider(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('serviceProviders', id)
}

// --------------- Calificaciones ---------------

export async function saveRating(rating: Rating): Promise<void> {
  const db = await getDB()
  await db.put('ratings', rating)
}

export async function getRating(entityType: string, entityId: string): Promise<Rating | undefined> {
  const db = await getDB()
  return db.get('ratings', `${entityType}_${entityId}`)
}

export async function deleteRating(entityType: string, entityId: string): Promise<void> {
  const db = await getDB()
  await db.delete('ratings', `${entityType}_${entityId}`)
}

// --------------- Compartir (token temporal 24h) ---------------

export async function createShareToken(profileId: string, sections: string[]): Promise<ShareToken> {
  const db = await getDB()
  const token: ShareToken = {
    token: crypto.randomUUID(),
    profileId,
    sections,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
  await db.put('shareTokens', token)
  return token
}

export async function getShareToken(token: string): Promise<ShareToken | null> {
  const db = await getDB()
  const found = await db.get('shareTokens', token)
  if (!found) return null
  if (new Date(found.expiresAt) < new Date()) {
    await db.delete('shareTokens', token)
    return null
  }
  return found
}

// --------------- Respaldo cifrado (.vsm) ---------------

export async function exportBackup(appState: AppState, pin: string): Promise<Blob> {
  const records: Record<string, unknown> = {}
  for (const profile of appState.profiles) {
    records[profile.id] = {
      medicalRecord: await getMedicalRecord(profile.id),
      doctors: await getDoctors(profile.id),
      appointments: await getAppointments(profile.id),
      symptoms: await getSymptoms(profile.id),
      progress: await getProgress(profile.id),
      medicalExams: await getMedicalExams(profile.id),
      serviceProviders: await getServiceProviders(profile.id)
    }
  }
  const payload = JSON.stringify({ appState, records, exportedAt: new Date().toISOString() })
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(pin, salt)
  const encrypted = await encrypt(payload, key)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const backup = JSON.stringify({ v: 1, salt: saltHex, data: encrypted })
  return new Blob([backup], { type: 'application/octet-stream' })
}

export async function importBackup(file: File, pin: string): Promise<AppState> {
  const text = await file.text()
  const { v, salt: saltHex, data } = JSON.parse(text)
  if (v !== 1) throw new Error('Versión de respaldo no compatible')
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)))
  const key = await deriveKey(pin, salt)
  const decrypted = await decrypt(data, key)
  const { appState } = JSON.parse(decrypted)
  return appState
}

// --------------- Helpers ---------------

export function generateId(): string {
  return crypto.randomUUID()
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-MX'
  utterance.rate = 0.85
  utterance.pitch = 1.1
  const voices = window.speechSynthesis.getVoices()
  const esVoice = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('female'))
    ?? voices.find(v => v.lang.startsWith('es'))
  if (esVoice) utterance.voice = esVoice
  window.speechSynthesis.speak(utterance)
}
