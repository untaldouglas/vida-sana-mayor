// ============================================================
// Tipos principales de Vida Sana Mayor
// Basado en FHIR R4 (simplificado para uso offline)
// ============================================================

export interface Profile {
  id: string
  name: string
  relation: string       // 'yo', 'esposa', 'hijo', 'hija', 'padre', 'madre', 'amigo', 'cuidador', ...
  isPrimary: boolean
  avatar?: string        // color hex o emoji
  createdAt: string
}

export interface AppState {
  profiles: Profile[]
  activeProfileId: string | null
  onboardingDone: boolean
  agreementAccepted: boolean
  pinHash: string | null
  authMethod: 'none' | 'pin' | 'biometric'
  encryptionKey: string | null  // derivado del PIN, guardado cifrado
  aiConfig?: AIConfig | null    // configuración opcional de IA del usuario
}

// FHIR R4 - Expediente clínico
export interface Allergy {
  id: string
  substance: string
  reaction: string
  severity: 'mild' | 'moderate' | 'severe'
  recordedDate: string
}

export interface Vaccine {
  id: string
  name: string
  date: string
  dose?: string
  nextDate?: string
}

export interface Diagnosis {
  id: string
  condition: string
  icdCode?: string
  onsetDate: string
  status: 'active' | 'resolved' | 'chronic'
  notes?: string
}

export interface Medication {
  id: string
  name: string
  dose: string
  frequency: string          // "cada 8 horas", "una vez al día"
  times: string[]            // ["08:00", "16:00", "24:00"]
  startDate: string
  endDate?: string
  stock: number              // pastillas restantes
  stockAlert: number         // alertar cuando queden X
  diagnosisId?: string
  notes?: string
  lastTaken?: string
  takenHistory: TakenRecord[]
  imageFileIds?: string[]    // fotos de la caja/receta
}

export interface TakenRecord {
  date: string
  time: string
  taken: boolean
}

export interface Consultation {
  id: string
  doctorId?: string
  date: string
  reason: string
  notes: string
  audioFileId?: string
  summary?: string
}

export interface LabResult {
  id: string
  testName: string
  date: string
  result: string
  unit?: string
  referenceRange?: string
  imageFileId?: string
}

export interface Surgery {
  id: string
  procedure: string
  date: string
  hospital?: string
  surgeon?: string
  notes?: string
}

export interface FamilyHistory {
  id: string
  relation: string
  condition: string
  notes?: string
}

export interface MedicalRecord {
  profileId: string
  allergies: Allergy[]
  vaccines: Vaccine[]
  diagnoses: Diagnosis[]
  medications: Medication[]
  consultations: Consultation[]
  labResults: LabResult[]
  surgeries: Surgery[]
  familyHistory: FamilyHistory[]
}

// Doctor
export interface Doctor {
  id: string
  name: string
  specialty: string
  phone?: string
  address?: string
  diagnosisIds: string[]
  notes?: string
  imageFileIds?: string[]    // foto de credencial, consultorio, etc.
}

// Cita médica
export interface Appointment {
  id: string
  doctorId?: string
  doctorName?: string
  date: string
  time: string
  reason: string
  location?: string
  reminder: boolean
  reminderMinutes: number
  notes?: string
  imageFileIds?: string[]    // fotos de indicaciones, resultados, etc.
}

// Síntoma / Diario
export interface SymptomEntry {
  id: string
  profileId: string
  date: string
  time: string
  painLevel: 0 | 1 | 2 | 3   // 0=sin dolor, 1=leve, 2=moderado, 3=severo
  description: string
  audioFileId?: string
  transcript?: string
  photoFileId?: string
  tags: string[]
}

// Progreso (soles)
export interface ProgressRecord {
  profileId: string
  streak: number             // días consecutivos de registro
  totalEntries: number
  lastEntryDate: string
  suns: number               // soles ganados
  messages: string[]
}

// Archivo adjunto (audio, foto, scan)
export interface MediaFile {
  id: string
  profileId: string
  type: 'audio' | 'photo' | 'scan'
  mimeType: string
  name: string
  createdAt: string
  data: ArrayBuffer          // almacenado en IndexedDB
  transcript?: string        // para audio
  ocrText?: string           // para scan
}

// Compartir temporal
export interface ShareToken {
  token: string
  profileId: string
  expiresAt: string
  sections: string[]
}

// ============================================================
// Inteligencia Artificial – configuración por usuario
// ============================================================

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'mistral' | 'ollama'

export interface AIConfig {
  provider: AIProvider
  apiKey: string          // almacenado localmente; vacío para Ollama (local, sin costo)
  model: string
  baseUrl?: string        // URL base; requerida para Ollama (ej: http://localhost:11434)
  acceptedTerms: boolean  // el usuario aceptó los términos de costos
  acceptedDate: string    // ISO date de aceptación
}

// Vista activa
export type AppView =
  | 'agreement'
  | 'onboarding'
  | 'auth'
  | 'dashboard'
  | 'medications'
  | 'record'
  | 'symptoms'
  | 'agenda'
  | 'doctors'
  | 'progress'
  | 'scan'
  | 'share'
  | 'settings'
  | 'backup'
