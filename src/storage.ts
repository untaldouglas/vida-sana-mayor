// ============================================================
// storage.ts – Capa de acceso a datos para Vida Sana Mayor
//
// Motor: SQLite WASM (sql.js) con PRAGMA foreign_keys = ON
// La integridad referencial es MANDATORIA a nivel de BD:
//   • FK explícitas en cada relación (ver src/db/schema.ts)
//   • ON DELETE CASCADE: perfiles eliminan TODO su árbol de datos
//   • ON DELETE SET NULL: referencias opcionales (doctor en cita)
//   • ON DELETE CASCADE en tablas pivote (doctor_diagnoses, etc.)
//
// Los binary blobs (audio, fotos) se almacenan en IDB "vsm-blobs"
// por eficiencia; su limpieza se hace ANTES del DELETE SQL.
// ============================================================

import type {
  AppState, Profile, MedicalRecord, Doctor, Appointment,
  SymptomEntry, ProgressRecord, MediaFile, ShareToken,
  MedicalExam, ServiceProvider, Rating,
  Allergy, Vaccine, Diagnosis, Medication, TakenRecord,
  Consultation, LabResult, Surgery, FamilyHistory, AIConfig
} from './types'
import {
  getDB, withTransaction, runSQL, querySQL,
  saveBlob, loadBlob, deleteBlob, persistSQL
} from './db/database'
import type { Database } from 'sql.js'

// ── Tipos de fila SQL (snake_case → camelCase via mappers) ────

type Row = Record<string, unknown>

// ── Helpers de mapeo ─────────────────────────────────────────

const str  = (v: unknown) => (v as string)  ?? ''
const ostr = (v: unknown) => (v as string | null) ?? undefined
const num  = (v: unknown) => (v as number)  ?? 0
const bool = (v: unknown) => (v as number)  === 1
const json = <T>(v: unknown): T => {
  if (!v) return [] as unknown as T
  try { return JSON.parse(v as string) as T } catch { return [] as unknown as T }
}

function mapProfile(r: Row): Profile {
  return {
    id: str(r.id), name: str(r.name), relation: str(r.relation),
    isPrimary: bool(r.is_primary), avatar: ostr(r.avatar),
    createdAt: str(r.created_at)
  }
}

function mapAllergy(r: Row): Allergy {
  return {
    id: str(r.id), substance: str(r.substance), reaction: str(r.reaction),
    severity: str(r.severity) as Allergy['severity'],
    recordedDate: str(r.recorded_date)
  }
}

function mapVaccine(r: Row): Vaccine {
  return {
    id: str(r.id), name: str(r.name), date: str(r.date),
    dose: ostr(r.dose), nextDate: ostr(r.next_date)
  }
}

function mapDiagnosis(r: Row): Diagnosis {
  return {
    id: str(r.id), condition: str(r.condition), icdCode: ostr(r.icd_code),
    onsetDate: str(r.onset_date), status: str(r.status) as Diagnosis['status'],
    notes: ostr(r.notes)
  }
}

function mapSurgery(r: Row): Surgery {
  return {
    id: str(r.id), procedure: str(r.procedure), date: str(r.date),
    hospital: ostr(r.hospital), surgeon: ostr(r.surgeon), notes: ostr(r.notes)
  }
}

function mapFamilyHistory(r: Row): FamilyHistory {
  return {
    id: str(r.id), relation: str(r.relation),
    condition: str(r.condition), notes: ostr(r.notes)
  }
}

function mapMedication(r: Row, taken: TakenRecord[], imageFileIds: string[]): Medication {
  return {
    id: str(r.id), name: str(r.name), dose: str(r.dose),
    frequency: str(r.frequency), times: json<string[]>(r.times),
    startDate: str(r.start_date), endDate: ostr(r.end_date),
    stock: num(r.stock), stockAlert: num(r.stock_alert),
    diagnosisId: ostr(r.diagnosis_id),
    prescribingDoctorId:       ostr(r.prescribing_doctor_id),
    prescriptionSource:        ostr(r.prescription_source),
    prescribingConsultationId: ostr(r.prescribing_consultation_id),
    notes: ostr(r.notes), lastTaken: ostr(r.last_taken), takenHistory: taken,
    imageFileIds: imageFileIds.length ? imageFileIds : undefined,
    rating: r.rating != null ? num(r.rating) : undefined
  }
}

function mapConsultation(r: Row): Consultation {
  return {
    id: str(r.id), doctorId: ostr(r.doctor_id), date: str(r.date),
    reason: str(r.reason), notes: str(r.notes),
    audioFileId: ostr(r.audio_file_id), summary: ostr(r.summary)
  }
}

function mapLabResult(r: Row): LabResult {
  return {
    id: str(r.id), testName: str(r.test_name), date: str(r.date),
    result: str(r.result), unit: ostr(r.unit),
    referenceRange: ostr(r.reference_range), imageFileId: ostr(r.image_file_id)
  }
}

function mapDoctor(r: Row, diagnosisIds: string[], imageFileIds: string[]): Doctor {
  return {
    id: str(r.id), name: str(r.name), specialty: str(r.specialty),
    phone: ostr(r.phone), address: ostr(r.address), notes: ostr(r.notes),
    diagnosisIds, imageFileIds: imageFileIds.length ? imageFileIds : undefined,
    audioNoteId: ostr(r.audio_note_id),
    rating: r.rating != null ? num(r.rating) : undefined,
    ratingNotes: ostr(r.rating_notes)
  }
}

function mapAppointment(r: Row, imageFileIds: string[]): Appointment {
  return {
    id: str(r.id), doctorId: ostr(r.doctor_id), doctorName: ostr(r.doctor_name),
    date: str(r.date), time: str(r.time), reason: str(r.reason),
    location: ostr(r.location), reminder: bool(r.reminder),
    reminderMinutes: num(r.reminder_minutes), notes: ostr(r.notes),
    imageFileIds: imageFileIds.length ? imageFileIds : undefined
  }
}

function mapSymptom(r: Row): SymptomEntry {
  return {
    id: str(r.id), profileId: str(r.profile_id), date: str(r.date),
    time: str(r.time), painLevel: num(r.pain_level) as SymptomEntry['painLevel'],
    description: str(r.description), audioFileId: ostr(r.audio_file_id),
    transcript: ostr(r.transcript), photoFileId: ostr(r.photo_file_id),
    tags: json<string[]>(r.tags)
  }
}

function mapExam(r: Row, imageFileIds: string[]): MedicalExam {
  return {
    id: str(r.id), profileId: str(r.profile_id),
    category: str(r.category) as MedicalExam['category'],
    examType: str(r.exam_type), date: str(r.date),
    status: str(r.status) as MedicalExam['status'],
    doctorId: ostr(r.doctor_id), doctorName: ostr(r.doctor_name),
    providerId: ostr(r.provider_id), providerName: ostr(r.provider_name),
    indication: ostr(r.indication), result: ostr(r.result),
    interpretation: ostr(r.interpretation), userNotes: ostr(r.user_notes),
    audioFileId: ostr(r.audio_file_id), aiSummary: ostr(r.ai_summary),
    imageFileIds: imageFileIds.length ? imageFileIds : undefined,
    rating: r.rating != null ? num(r.rating) : undefined,
    createdAt: str(r.created_at)
  }
}

function mapProvider(r: Row, imageFileIds: string[]): ServiceProvider {
  return {
    id: str(r.id), profileId: str(r.profile_id), name: str(r.name),
    category: str(r.category) as ServiceProvider['category'],
    subcategory: ostr(r.subcategory), address: ostr(r.address),
    phone: ostr(r.phone), website: ostr(r.website), notes: ostr(r.notes),
    audioNoteId: ostr(r.audio_note_id), aiSummary: ostr(r.ai_summary),
    imageFileIds: imageFileIds.length ? imageFileIds : undefined,
    rating: r.rating != null ? num(r.rating) : undefined,
    ratingNotes: ostr(r.rating_notes), createdAt: str(r.created_at)
  }
}

// ── Helper: recopilar IDs de media antes de un DELETE ─────────
// Los FK de SQL eliminan la metadata de media_files via CASCADE,
// pero el binary blob en IDB "vsm-blobs" debe limpiarse aquí.

async function collectMediaIds(db: Database, ...queries: {sql: string; params: unknown[]}[]): Promise<string[]> {
  const ids: string[] = []
  for (const q of queries) {
    const rows = querySQL<{id: string}>(db, q.sql, q.params)
    ids.push(...rows.map(r => r.id))
  }
  return ids
}

async function deleteBlobsFor(ids: string[]): Promise<void> {
  for (const id of ids) await deleteBlob(id)
}

// ── Helper: sincronizar tabla de IDs simples ──────────────────
// Inserta los nuevos, elimina los que ya no están.
// Usado para tablas pivote (doctor_diagnoses, etc.)

function syncPivotIds(
  db: Database,
  table: string, parentCol: string, childCol: string,
  parentId: string, newIds: string[]
): void {
  // Eliminar los que ya no están
  const existingRows = querySQL<{id: string}>(
    db, `SELECT ${childCol} AS id FROM ${table} WHERE ${parentCol} = ?`, [parentId]
  )
  for (const r of existingRows) {
    if (!newIds.includes(r.id)) {
      runSQL(db, `DELETE FROM ${table} WHERE ${parentCol} = ? AND ${childCol} = ?`, [parentId, r.id])
    }
  }
  // Insertar los nuevos
  for (const childId of newIds) {
    runSQL(db, `INSERT OR IGNORE INTO ${table} (${parentCol}, ${childCol}) VALUES (?,?)`, [parentId, childId])
  }
}

// ── Validación a nivel de servicio (defensa en profundidad) ───
// Verifica existencia de entidad antes de insertar una referencia.

async function assertExists(table: string, id: string, label: string): Promise<void> {
  const db = await getDB()
  const rows = querySQL(db, `SELECT 1 FROM ${table} WHERE id = ?`, [id])
  if (rows.length === 0) throw new Error(`${label} con id="${id}" no existe`)
}

// ============================================================
// Cifrado AES-256-GCM (sin cambios)
// ============================================================

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const km = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310_000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data))
  const combined = new Uint8Array(iv.length + ct.byteLength)
  combined.set(iv, 0); combined.set(new Uint8Array(ct), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ct = combined.slice(12)
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(dec)
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const km = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310_000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

// ============================================================
// AppState
// ============================================================

export async function loadAppState(): Promise<AppState | null> {
  const db = await getDB()
  const stateRows = querySQL<Row>(db, `SELECT * FROM app_state WHERE id = 'main'`)
  if (stateRows.length === 0) return null
  const s = stateRows[0]
  const profileRows = querySQL<Row>(db, 'SELECT * FROM profiles ORDER BY created_at')
  return {
    profiles:          profileRows.map(mapProfile),
    activeProfileId:   ostr(s.active_profile_id) ?? null,
    onboardingDone:    bool(s.onboarding_done),
    agreementAccepted: bool(s.agreement_accepted),
    pinHash:           ostr(s.pin_hash) ?? null,
    authMethod:        str(s.auth_method) as AppState['authMethod'],
    encryptionKey:     ostr(s.encryption_key) ?? null,
    aiConfig:          s.ai_config ? JSON.parse(str(s.ai_config)) as AIConfig : null
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  await withTransaction(db => {
    // 1. Upsert singleton de app_state
    runSQL(db,
      `INSERT OR REPLACE INTO app_state
         (id, active_profile_id, onboarding_done, agreement_accepted,
          pin_hash, auth_method, encryption_key, ai_config)
       VALUES ('main',?,?,?,?,?,?,?)`,
      [
        state.activeProfileId ?? null,
        state.onboardingDone    ? 1 : 0,
        state.agreementAccepted ? 1 : 0,
        state.pinHash    ?? null,
        state.authMethod,
        state.encryptionKey ?? null,
        state.aiConfig ? JSON.stringify(state.aiConfig) : null
      ]
    )

    // 2. Upsert todos los perfiles del estado en memoria
    for (const p of state.profiles) {
      runSQL(db,
        `INSERT OR REPLACE INTO profiles (id, name, relation, is_primary, avatar, created_at)
         VALUES (?,?,?,?,?,?)`,
        [p.id, p.name, p.relation, p.isPrimary ? 1 : 0, p.avatar ?? null, p.createdAt]
      )
    }

    // 3. Eliminar perfiles que ya no están en el estado
    //    (ON DELETE CASCADE limpia todo su árbol de datos)
    if (state.profiles.length > 0) {
      const ph = state.profiles.map(() => '?').join(',')
      runSQL(db,
        `DELETE FROM profiles WHERE id NOT IN (${ph})`,
        state.profiles.map(p => p.id)
      )
    }
  })
}

// ============================================================
// Perfiles
// ============================================================

export async function getProfiles(): Promise<Profile[]> {
  const db = await getDB()
  return querySQL<Row>(db, 'SELECT * FROM profiles ORDER BY created_at').map(mapProfile)
}

export async function saveProfile(profile: Profile): Promise<void> {
  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO profiles (id, name, relation, is_primary, avatar, created_at)
       VALUES (?,?,?,?,?,?)`,
      [profile.id, profile.name, profile.relation, profile.isPrimary ? 1 : 0,
       profile.avatar ?? null, profile.createdAt]
    )
  })
}

export async function deleteProfile(profileId: string): Promise<void> {
  const db = await getDB()

  // Recopilar IDs de blobs ANTES del DELETE (el CASCADE SQL eliminará metadata)
  const blobIds = await collectMediaIds(db,
    { sql: 'SELECT id FROM media_files WHERE profile_id = ?', params: [profileId] }
  )

  await withTransaction(db => {
    // ON DELETE CASCADE elimina automáticamente:
    //   media_files, allergies, vaccines, diagnoses (→ doctor_diagnoses,
    //   medications→taken_history, medication_media→media_files),
    //   surgeries, family_history, doctors (→consultations, appointments,
    //   medical_exams, doctor_diagnoses, doctor_media→media_files),
    //   lab_results, symptoms, progress, share_tokens,
    //   service_providers (→provider_media→media_files, medical_exams),
    //   exam_media→media_files, app_state.active_profile_id (SET NULL)
    runSQL(db, 'DELETE FROM profiles WHERE id = ?', [profileId])
  })

  // Limpiar binary blobs (el único recurso fuera de SQLite)
  await deleteBlobsFor(blobIds)
}

// ============================================================
// Expediente clínico – getMedicalRecord / saveMedicalRecord
// ============================================================

export async function getMedicalRecord(profileId: string): Promise<MedicalRecord> {
  const db = await getDB()

  // Medicamentos con historial de toma e imágenes
  const medRows = querySQL<Row>(db,
    'SELECT * FROM medications WHERE profile_id = ? ORDER BY name', [profileId])
  const medications: Medication[] = medRows.map(r => {
    const taken = querySQL<Row>(db,
      'SELECT * FROM medication_taken_history WHERE medication_id = ? ORDER BY date, time',
      [r.id]
    ).map(t => ({ date: str(t.date), time: str(t.time), taken: bool(t.taken) }) as TakenRecord)
    const imgs = querySQL<{media_id: string}>(db,
      'SELECT media_id FROM medication_media WHERE medication_id = ?', [r.id]
    ).map(x => x.media_id)
    return mapMedication(r, taken, imgs)
  })

  return {
    profileId,
    allergies:     querySQL<Row>(db, 'SELECT * FROM allergies     WHERE profile_id = ?', [profileId]).map(mapAllergy),
    vaccines:      querySQL<Row>(db, 'SELECT * FROM vaccines      WHERE profile_id = ? ORDER BY date', [profileId]).map(mapVaccine),
    diagnoses:     querySQL<Row>(db, 'SELECT * FROM diagnoses     WHERE profile_id = ?', [profileId]).map(mapDiagnosis),
    medications,
    consultations: querySQL<Row>(db, 'SELECT * FROM consultations WHERE profile_id = ? ORDER BY date DESC', [profileId]).map(mapConsultation),
    labResults:    querySQL<Row>(db, 'SELECT * FROM lab_results   WHERE profile_id = ? ORDER BY date DESC', [profileId]).map(mapLabResult),
    surgeries:     querySQL<Row>(db, 'SELECT * FROM surgeries     WHERE profile_id = ? ORDER BY date DESC', [profileId]).map(mapSurgery),
    familyHistory: querySQL<Row>(db, 'SELECT * FROM family_history WHERE profile_id = ?', [profileId]).map(mapFamilyHistory)
  }
}

/**
 * Persiste el expediente completo.
 * Realiza upsert de cada sub-tabla y elimina los ítems
 * que ya no están en el objeto record (comparando IDs).
 * Todo en una sola transacción para atomicidad.
 */
export async function saveMedicalRecord(record: MedicalRecord): Promise<void> {
  const pid = record.profileId
  await withTransaction(db => {
    // ── Alergias ──────────────────────────────────────────────
    _syncSimpleItems(db, 'allergies', pid, record.allergies, (db, a) =>
      runSQL(db,
        `INSERT OR REPLACE INTO allergies (id, profile_id, substance, reaction, severity, recorded_date)
         VALUES (?,?,?,?,?,?)`,
        [a.id, pid, a.substance, a.reaction, a.severity, a.recordedDate]
      )
    )
    // ── Vacunas ───────────────────────────────────────────────
    _syncSimpleItems(db, 'vaccines', pid, record.vaccines, (db, v) =>
      runSQL(db,
        `INSERT OR REPLACE INTO vaccines (id, profile_id, name, date, dose, next_date)
         VALUES (?,?,?,?,?,?)`,
        [v.id, pid, v.name, v.date, v.dose ?? null, v.nextDate ?? null]
      )
    )
    // ── Diagnósticos ──────────────────────────────────────────
    // ANTES de medicamentos (FK medications.diagnosis_id → diagnoses.id)
    _syncSimpleItems(db, 'diagnoses', pid, record.diagnoses, (db, d) =>
      runSQL(db,
        `INSERT OR REPLACE INTO diagnoses (id, profile_id, condition, icd_code, onset_date, status, notes)
         VALUES (?,?,?,?,?,?,?)`,
        [d.id, pid, d.condition, d.icdCode ?? null, d.onsetDate, d.status, d.notes ?? null]
      )
    )
    // ── Medicamentos ──────────────────────────────────────────
    _syncSimpleItems(db, 'medications', pid, record.medications, (db, m) => {
      runSQL(db,
        `INSERT OR REPLACE INTO medications
           (id, profile_id, diagnosis_id,
            prescribing_doctor_id, prescription_source, prescribing_consultation_id,
            name, dose, frequency, times,
            start_date, end_date, stock, stock_alert, notes, last_taken, rating)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [m.id, pid, m.diagnosisId ?? null,
         m.prescribingDoctorId ?? null, m.prescriptionSource ?? null,
         m.prescribingConsultationId ?? null,
         m.name, m.dose, m.frequency,
         JSON.stringify(m.times), m.startDate, m.endDate ?? null,
         m.stock, m.stockAlert, m.notes ?? null, m.lastTaken ?? null, m.rating ?? null]
      )
      // Taken history: eliminar y reinsertar (es un array de valor)
      runSQL(db, 'DELETE FROM medication_taken_history WHERE medication_id = ?', [m.id])
      for (const t of m.takenHistory) {
        runSQL(db,
          `INSERT INTO medication_taken_history (id, medication_id, date, time, taken)
           VALUES (?,?,?,?,?)`,
          [generateId(), m.id, t.date, t.time, t.taken ? 1 : 0]
        )
      }
    })
    // ── Consultas ─────────────────────────────────────────────
    _syncSimpleItems(db, 'consultations', pid, record.consultations, (db, c) =>
      runSQL(db,
        `INSERT OR REPLACE INTO consultations
           (id, profile_id, doctor_id, date, reason, notes, audio_file_id, summary)
         VALUES (?,?,?,?,?,?,?,?)`,
        [c.id, pid, c.doctorId ?? null, c.date, c.reason, c.notes,
         c.audioFileId ?? null, c.summary ?? null]
      )
    )
    // ── Resultados de laboratorio ─────────────────────────────
    _syncSimpleItems(db, 'lab_results', pid, record.labResults, (db, l) =>
      runSQL(db,
        `INSERT OR REPLACE INTO lab_results
           (id, profile_id, test_name, date, result, unit, reference_range, image_file_id)
         VALUES (?,?,?,?,?,?,?,?)`,
        [l.id, pid, l.testName, l.date, l.result, l.unit ?? null,
         l.referenceRange ?? null, l.imageFileId ?? null]
      )
    )
    // ── Cirugías ──────────────────────────────────────────────
    _syncSimpleItems(db, 'surgeries', pid, record.surgeries, (db, s) =>
      runSQL(db,
        `INSERT OR REPLACE INTO surgeries
           (id, profile_id, procedure, date, hospital, surgeon, notes)
         VALUES (?,?,?,?,?,?,?)`,
        [s.id, pid, s.procedure, s.date, s.hospital ?? null, s.surgeon ?? null, s.notes ?? null]
      )
    )
    // ── Antecedentes familiares ───────────────────────────────
    _syncSimpleItems(db, 'family_history', pid, record.familyHistory, (db, f) =>
      runSQL(db,
        `INSERT OR REPLACE INTO family_history (id, profile_id, relation, condition, notes)
         VALUES (?,?,?,?,?)`,
        [f.id, pid, f.relation, f.condition, f.notes ?? null]
      )
    )
  })
}

/** Sincroniza una sub-tabla: upsert ítems nuevos/modificados, elimina los removidos */
function _syncSimpleItems<T extends {id: string}>(
  db: Database, table: string, profileId: string,
  items: T[], upsertFn: (db: Database, item: T) => void
): void {
  const existing = querySQL<{id: string}>(db,
    `SELECT id FROM ${table} WHERE profile_id = ?`, [profileId]
  ).map(r => r.id)

  const newIds = items.map(i => i.id)

  // Eliminar los que ya no están (ON DELETE CASCADE limpia sus hijos)
  for (const id of existing) {
    if (!newIds.includes(id)) runSQL(db, `DELETE FROM ${table} WHERE id = ?`, [id])
  }
  // Upsert los nuevos/modificados
  for (const item of items) upsertFn(db, item)
}

// ============================================================
// Diagnóstico – eliminación con integridad referencial
// Las FK hacen:
//   - doctor_diagnoses.diagnosis_id ON DELETE CASCADE
//   - medications.diagnosis_id      ON DELETE SET NULL
// Esta función solo valida pertenencia al perfil.
// ============================================================

export async function deleteDiagnosis(profileId: string, diagnosisId: string): Promise<void> {
  const db = await getDB()
  const rows = querySQL(db,
    'SELECT 1 FROM diagnoses WHERE id = ? AND profile_id = ?', [diagnosisId, profileId]
  )
  if (rows.length === 0) throw new Error('Diagnóstico no encontrado o no pertenece al perfil')

  await withTransaction(db => {
    runSQL(db, 'DELETE FROM diagnoses WHERE id = ? AND profile_id = ?', [diagnosisId, profileId])
    // FK ON DELETE CASCADE → elimina filas en doctor_diagnoses
    // FK ON DELETE SET NULL → pone NULL en medications.diagnosis_id
  })
}

// ============================================================
// Doctores
// ============================================================

export async function getDoctors(profileId: string): Promise<Doctor[]> {
  const db = await getDB()
  const rows = querySQL<Row>(db,
    'SELECT * FROM doctors WHERE profile_id = ? ORDER BY name', [profileId])
  return rows.map(r => {
    const diagIds = querySQL<{diagnosis_id: string}>(db,
      'SELECT diagnosis_id FROM doctor_diagnoses WHERE doctor_id = ?', [r.id]
    ).map(x => x.diagnosis_id)
    const imgIds = querySQL<{media_id: string}>(db,
      'SELECT media_id FROM doctor_media WHERE doctor_id = ?', [r.id]
    ).map(x => x.media_id)
    return mapDoctor(r, diagIds, imgIds)
  })
}

export async function saveDoctor(doctor: Doctor & { profileId: string }): Promise<void> {
  // Validación en capa de servicio: diagnósticos deben existir
  for (const dId of doctor.diagnosisIds) {
    await assertExists('diagnoses', dId, 'Diagnóstico')
  }
  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO doctors
         (id, profile_id, name, specialty, phone, address, notes,
          audio_note_id, rating, rating_notes)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [doctor.id, doctor.profileId, doctor.name, doctor.specialty,
       doctor.phone ?? null, doctor.address ?? null, doctor.notes ?? null,
       doctor.audioNoteId ?? null, doctor.rating ?? null, doctor.ratingNotes ?? null]
    )
    // M:N doctor ↔ diagnoses (tabla pivote doctor_diagnoses)
    syncPivotIds(db, 'doctor_diagnoses', 'doctor_id', 'diagnosis_id',
      doctor.id, doctor.diagnosisIds)
    // M:N doctor ↔ media (tabla pivote doctor_media)
    syncPivotIds(db, 'doctor_media', 'doctor_id', 'media_id',
      doctor.id, doctor.imageFileIds ?? [])
  })
}

export async function deleteDoctor(doctorId: string): Promise<void> {
  const db = await getDB()

  // Recopilar blobs antes del DELETE SQL (CASCADE eliminará metadata)
  const blobIds = await collectMediaIds(db,
    { sql: 'SELECT m.id FROM media_files m JOIN doctor_media dm ON dm.media_id = m.id WHERE dm.doctor_id = ?', params: [doctorId] },
    { sql: 'SELECT id FROM media_files WHERE id = (SELECT audio_note_id FROM doctors WHERE id = ?)', params: [doctorId] }
  )

  await withTransaction(db => {
    runSQL(db, 'DELETE FROM doctors WHERE id = ?', [doctorId])
    // ON DELETE CASCADE → doctor_diagnoses, doctor_media → media_files
    // ON DELETE SET NULL → consultations.doctor_id, appointments.doctor_id, medical_exams.doctor_id
  })

  await deleteBlobsFor(blobIds)
}

// ============================================================
// Citas médicas
// ============================================================

export async function getAppointments(profileId: string): Promise<Appointment[]> {
  const db = await getDB()
  const rows = querySQL<Row>(db,
    'SELECT * FROM appointments WHERE profile_id = ? ORDER BY date, time', [profileId])
  return rows.map(r => {
    const imgs = querySQL<{media_id: string}>(db,
      'SELECT media_id FROM appointment_media WHERE appointment_id = ?', [r.id]
    ).map(x => x.media_id)
    return mapAppointment(r, imgs)
  })
}

export async function saveAppointment(appt: Appointment & { profileId: string }): Promise<void> {
  // Validación en capa de servicio: doctor debe existir si se especifica
  if (appt.doctorId) await assertExists('doctors', appt.doctorId, 'Doctor')
  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO appointments
         (id, profile_id, doctor_id, doctor_name, date, time, reason,
          location, reminder, reminder_minutes, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [appt.id, appt.profileId, appt.doctorId ?? null, appt.doctorName ?? null,
       appt.date, appt.time, appt.reason, appt.location ?? null,
       appt.reminder ? 1 : 0, appt.reminderMinutes, appt.notes ?? null]
    )
    syncPivotIds(db, 'appointment_media', 'appointment_id', 'media_id',
      appt.id, appt.imageFileIds ?? [])
  })
}

export async function deleteAppointment(apptId: string): Promise<void> {
  const db = await getDB()
  const blobIds = await collectMediaIds(db,
    { sql: 'SELECT m.id FROM media_files m JOIN appointment_media am ON am.media_id = m.id WHERE am.appointment_id = ?', params: [apptId] }
  )
  await withTransaction(db => {
    runSQL(db, 'DELETE FROM appointments WHERE id = ?', [apptId])
    // ON DELETE CASCADE → appointment_media → media_files
  })
  await deleteBlobsFor(blobIds)
}

// ============================================================
// Síntomas / Diario
// ============================================================

export async function getSymptoms(profileId: string): Promise<SymptomEntry[]> {
  const db = await getDB()
  return querySQL<Row>(db,
    'SELECT * FROM symptoms WHERE profile_id = ? ORDER BY date DESC, time DESC', [profileId]
  ).map(mapSymptom)
}

export async function saveSymptom(entry: SymptomEntry): Promise<void> {
  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO symptoms
         (id, profile_id, date, time, pain_level, description,
          audio_file_id, transcript, photo_file_id, tags)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [entry.id, entry.profileId, entry.date, entry.time, entry.painLevel,
       entry.description, entry.audioFileId ?? null, entry.transcript ?? null,
       entry.photoFileId ?? null, JSON.stringify(entry.tags)]
    )
  })
}

export async function deleteSymptom(id: string): Promise<void> {
  const db = await getDB()
  const blobIds = await collectMediaIds(db,
    { sql: `SELECT id FROM media_files WHERE id IN
              (SELECT audio_file_id FROM symptoms WHERE id = ?)
              OR id IN (SELECT photo_file_id FROM symptoms WHERE id = ?)`,
      params: [id, id] }
  )
  await withTransaction(db => {
    runSQL(db, 'DELETE FROM symptoms WHERE id = ?', [id])
    // ON DELETE SET NULL → media_files refs quedan con NULL en symptoms
    // (los blobs se limpian en deleteBlobsFor)
  })
  await deleteBlobsFor(blobIds)
}

// ============================================================
// Progreso
// ============================================================

export async function getProgress(profileId: string): Promise<ProgressRecord> {
  const db = await getDB()
  const rows = querySQL<Row>(db, 'SELECT * FROM progress WHERE profile_id = ?', [profileId])
  if (rows.length === 0) {
    return { profileId, streak: 0, totalEntries: 0, lastEntryDate: '', suns: 0, messages: [] }
  }
  const r = rows[0]
  return {
    profileId, streak: num(r.streak), totalEntries: num(r.total_entries),
    lastEntryDate: str(r.last_entry_date), suns: num(r.suns),
    messages: json<string[]>(r.messages)
  }
}

export async function updateProgress(profileId: string): Promise<ProgressRecord> {
  let progress = await getProgress(profileId)
  if (!progress || typeof progress.lastEntryDate !== 'string') {
    progress = { profileId, streak: 0, totalEntries: 0, lastEntryDate: '', suns: 0, messages: [] }
  }
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
  if (progress.lastEntryDate !== today) {
    progress.streak       = progress.lastEntryDate === yesterday ? progress.streak + 1 : 1
    progress.lastEntryDate = today
    progress.totalEntries++
    progress.suns         = Math.floor(progress.totalEntries / 3)
  }
  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO progress
         (profile_id, streak, total_entries, last_entry_date, suns, messages)
       VALUES (?,?,?,?,?,?)`,
      [profileId, progress.streak, progress.totalEntries,
       progress.lastEntryDate, progress.suns, JSON.stringify(progress.messages)]
    )
  })
  return progress
}

// ============================================================
// Media (metadata en SQL, binary blob en IDB "vsm-blobs")
// ============================================================

export async function saveMedia(file: MediaFile): Promise<void> {
  // Guardar blob binario en IDB
  await saveBlob(file.id, file.data)

  // Guardar metadata en SQLite
  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO media_files
         (id, profile_id, type, mime_type, name, created_at, transcript, ocr_text)
       VALUES (?,?,?,?,?,?,?,?)`,
      [file.id, file.profileId, file.type, file.mimeType, file.name,
       file.createdAt, file.transcript ?? null, file.ocrText ?? null]
    )
  })
}

export async function getMedia(id: string): Promise<MediaFile | undefined> {
  const db = await getDB()
  const rows = querySQL<Row>(db, 'SELECT * FROM media_files WHERE id = ?', [id])
  if (rows.length === 0) return undefined
  const r = rows[0]
  const data = await loadBlob(id)
  if (!data) return undefined
  return {
    id: str(r.id), profileId: str(r.profile_id),
    type: str(r.type) as MediaFile['type'],
    mimeType: str(r.mime_type), name: str(r.name), createdAt: str(r.created_at),
    data, transcript: ostr(r.transcript), ocrText: ostr(r.ocr_text)
  }
}

export async function deleteMedia(id: string): Promise<void> {
  // Limpiar blob ANTES del DELETE SQL (el FK ON DELETE SET NULL limpia las referencias)
  await deleteBlob(id)
  await withTransaction(db => {
    runSQL(db, 'DELETE FROM media_files WHERE id = ?', [id])
  })
}

// ============================================================
// Exámenes médicos
// ============================================================

export async function getMedicalExams(profileId: string): Promise<MedicalExam[]> {
  const db = await getDB()
  const rows = querySQL<Row>(db,
    'SELECT * FROM medical_exams WHERE profile_id = ? ORDER BY date DESC', [profileId])
  return rows.map(r => {
    const imgs = querySQL<{media_id: string}>(db,
      'SELECT media_id FROM exam_media WHERE exam_id = ?', [r.id]
    ).map(x => x.media_id)
    return mapExam(r, imgs)
  })
}

export async function saveMedicalExam(exam: MedicalExam): Promise<void> {
  // Validación en capa de servicio
  if (exam.doctorId)   await assertExists('doctors',           exam.doctorId,   'Doctor')
  if (exam.providerId) await assertExists('service_providers', exam.providerId, 'Proveedor')

  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO medical_exams
         (id, profile_id, doctor_id, doctor_name, provider_id, provider_name,
          category, exam_type, date, status, indication, result, interpretation,
          user_notes, audio_file_id, ai_summary, rating, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [exam.id, exam.profileId, exam.doctorId ?? null, exam.doctorName ?? null,
       exam.providerId ?? null, exam.providerName ?? null, exam.category,
       exam.examType, exam.date, exam.status, exam.indication ?? null,
       exam.result ?? null, exam.interpretation ?? null, exam.userNotes ?? null,
       exam.audioFileId ?? null, exam.aiSummary ?? null, exam.rating ?? null, exam.createdAt]
    )
    syncPivotIds(db, 'exam_media', 'exam_id', 'media_id', exam.id, exam.imageFileIds ?? [])
  })
}

export async function deleteMedicalExam(id: string): Promise<void> {
  const db = await getDB()
  const blobIds = await collectMediaIds(db,
    { sql: 'SELECT m.id FROM media_files m JOIN exam_media em ON em.media_id = m.id WHERE em.exam_id = ?', params: [id] },
    { sql: 'SELECT id FROM media_files WHERE id = (SELECT audio_file_id FROM medical_exams WHERE id = ?)', params: [id] }
  )
  await withTransaction(db => {
    runSQL(db, 'DELETE FROM medical_exams WHERE id = ?', [id])
    // ON DELETE CASCADE → exam_media → media_files
    // ON DELETE SET NULL para audio_file_id (ya limpiamos el blob)
  })
  await deleteBlobsFor(blobIds)
}

// ============================================================
// Proveedores de servicio
// ============================================================

export async function getServiceProviders(profileId: string): Promise<ServiceProvider[]> {
  const db = await getDB()
  const rows = querySQL<Row>(db,
    'SELECT * FROM service_providers WHERE profile_id = ? ORDER BY name', [profileId])
  return rows.map(r => {
    const imgs = querySQL<{media_id: string}>(db,
      'SELECT media_id FROM provider_media WHERE provider_id = ?', [r.id]
    ).map(x => x.media_id)
    return mapProvider(r, imgs)
  })
}

export async function saveServiceProvider(provider: ServiceProvider): Promise<void> {
  await withTransaction(db => {
    runSQL(db,
      `INSERT OR REPLACE INTO service_providers
         (id, profile_id, name, category, subcategory, address, phone, website,
          notes, audio_note_id, ai_summary, rating, rating_notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [provider.id, provider.profileId, provider.name, provider.category,
       provider.subcategory ?? null, provider.address ?? null, provider.phone ?? null,
       provider.website ?? null, provider.notes ?? null, provider.audioNoteId ?? null,
       provider.aiSummary ?? null, provider.rating ?? null, provider.ratingNotes ?? null,
       provider.createdAt]
    )
    syncPivotIds(db, 'provider_media', 'provider_id', 'media_id',
      provider.id, provider.imageFileIds ?? [])
  })
}

export async function deleteServiceProvider(id: string): Promise<void> {
  const db = await getDB()
  const blobIds = await collectMediaIds(db,
    { sql: 'SELECT m.id FROM media_files m JOIN provider_media pm ON pm.media_id = m.id WHERE pm.provider_id = ?', params: [id] },
    { sql: 'SELECT id FROM media_files WHERE id = (SELECT audio_note_id FROM service_providers WHERE id = ?)', params: [id] }
  )
  await withTransaction(db => {
    runSQL(db, 'DELETE FROM service_providers WHERE id = ?', [id])
    // ON DELETE CASCADE → provider_media → media_files
    // ON DELETE SET NULL → medical_exams.provider_id
  })
  await deleteBlobsFor(blobIds)
}

// ============================================================
// Calificaciones (Rating)
// Implementadas sobre los campos rating/rating_notes de las entidades.
// La tabla pivote de SQL garantiza que entityId sea válido.
// ============================================================

export async function saveRating(rating: Rating): Promise<void> {
  const tableMap: Record<string, {table: string; hasNotes: boolean}> = {
    doctor:     { table: 'doctors',           hasNotes: true  },
    provider:   { table: 'service_providers', hasNotes: true  },
    medication: { table: 'medications',       hasNotes: false },
    exam:       { table: 'medical_exams',     hasNotes: false },
    diagnosis:  { table: 'diagnoses',         hasNotes: false }
  }
  const meta = tableMap[rating.entityType]
  if (!meta) return
  await withTransaction(db => {
    if (meta.hasNotes) {
      runSQL(db,
        `UPDATE ${meta.table} SET rating = ?, rating_notes = ? WHERE id = ?`,
        [rating.score, rating.notes ?? null, rating.entityId]
      )
    } else {
      runSQL(db,
        `UPDATE ${meta.table} SET rating = ? WHERE id = ?`,
        [rating.score, rating.entityId]
      )
    }
  })
}

export async function getRating(entityType: string, entityId: string): Promise<Rating | undefined> {
  const db = await getDB()
  const tableMap: Record<string, {table: string; hasNotes: boolean}> = {
    doctor:     { table: 'doctors',           hasNotes: true  },
    provider:   { table: 'service_providers', hasNotes: true  },
    medication: { table: 'medications',       hasNotes: false },
    exam:       { table: 'medical_exams',     hasNotes: false },
    diagnosis:  { table: 'diagnoses',         hasNotes: false }
  }
  const meta = tableMap[entityType]
  if (!meta) return undefined

  const cols = meta.hasNotes ? 'rating, rating_notes, profile_id' : 'rating, profile_id'
  const rows = querySQL<Row>(db, `SELECT ${cols} FROM ${meta.table} WHERE id = ?`, [entityId])
  if (rows.length === 0 || rows[0].rating == null) return undefined
  return {
    id:         `${entityType}_${entityId}`,
    profileId:  str(rows[0].profile_id),
    entityType: entityType as Rating['entityType'],
    entityId,
    score:      num(rows[0].rating),
    notes:      meta.hasNotes ? ostr(rows[0].rating_notes) : undefined,
    date:       new Date().toISOString()
  }
}

export async function deleteRating(entityType: string, entityId: string): Promise<void> {
  const tableMap: Record<string, string> = {
    doctor: 'doctors', provider: 'service_providers',
    medication: 'medications', exam: 'medical_exams', diagnosis: 'diagnoses'
  }
  const table = tableMap[entityType]
  if (!table) return
  await withTransaction(db => {
    if (table === 'doctors' || table === 'service_providers') {
      runSQL(db, `UPDATE ${table} SET rating = NULL, rating_notes = NULL WHERE id = ?`, [entityId])
    } else {
      runSQL(db, `UPDATE ${table} SET rating = NULL WHERE id = ?`, [entityId])
    }
  })
}

// ============================================================
// Tokens de compartir
// ============================================================

export async function createShareToken(profileId: string, sections: string[]): Promise<ShareToken> {
  const token: ShareToken = {
    token: crypto.randomUUID(), profileId, sections,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
  await withTransaction(db => {
    runSQL(db,
      `INSERT INTO share_tokens (token, profile_id, expires_at, sections) VALUES (?,?,?,?)`,
      [token.token, profileId, token.expiresAt, JSON.stringify(sections)]
    )
  })
  return token
}

export async function getShareToken(token: string): Promise<ShareToken | null> {
  const db = await getDB()
  const rows = querySQL<Row>(db, 'SELECT * FROM share_tokens WHERE token = ?', [token])
  if (rows.length === 0) return null
  const r = rows[0]
  if (new Date(str(r.expires_at)) < new Date()) {
    await withTransaction(db => runSQL(db, 'DELETE FROM share_tokens WHERE token = ?', [token]))
    return null
  }
  return {
    token: str(r.token), profileId: str(r.profile_id),
    expiresAt: str(r.expires_at), sections: json<string[]>(r.sections)
  }
}

// ============================================================
// Respaldo cifrado (.vsm)
// ============================================================

export async function exportBackup(appState: AppState, pin: string): Promise<Blob> {
  const records: Record<string, unknown> = {}
  for (const profile of appState.profiles) {
    records[profile.id] = {
      medicalRecord:    await getMedicalRecord(profile.id),
      doctors:          await getDoctors(profile.id),
      appointments:     await getAppointments(profile.id),
      symptoms:         await getSymptoms(profile.id),
      progress:         await getProgress(profile.id),
      medicalExams:     await getMedicalExams(profile.id),
      serviceProviders: await getServiceProviders(profile.id)
    }
  }
  const payload  = JSON.stringify({ appState, records, exportedAt: new Date().toISOString() })
  const salt     = crypto.getRandomValues(new Uint8Array(16))
  const key      = await deriveKey(pin, salt)
  const encrypted = await encrypt(payload, key)
  const saltHex  = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const backup   = JSON.stringify({ v: 1, salt: saltHex, data: encrypted })
  return new Blob([backup], { type: 'application/octet-stream' })
}

export async function importBackup(file: File, pin: string): Promise<AppState> {
  const text = await file.text()
  const { v, salt: saltHex, data } = JSON.parse(text)
  if (v !== 1) throw new Error('Versión de respaldo no compatible')
  const salt      = Uint8Array.from(saltHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)))
  const key       = await deriveKey(pin, salt)
  const decrypted = await decrypt(data, key)
  const { appState } = JSON.parse(decrypted)
  return appState as AppState
}

// ============================================================
// Helpers
// ============================================================

export function generateId(): string {
  return crypto.randomUUID()
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance  = new SpeechSynthesisUtterance(text)
  utterance.lang   = 'es-MX'
  utterance.rate   = 0.85
  utterance.pitch  = 1.1
  const voices     = window.speechSynthesis.getVoices()
  const esVoice    = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('female'))
                  ?? voices.find(v => v.lang.startsWith('es'))
  if (esVoice) utterance.voice = esVoice
  window.speechSynthesis.speak(utterance)
}

// Re-export persistSQL por si algún componente necesita forzar persistencia
export { persistSQL }
