// ============================================================
// schema.ts – DDL completo con FK explícitas
// PRAGMA foreign_keys = ON  (obligatorio en cada conexión)
// Orden de creación respeta dependencias de FK
// ============================================================

export const SCHEMA_SQL = `

-- ── Perfiles (agregado raíz) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  relation   TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  avatar     TEXT,
  created_at TEXT NOT NULL
);

-- ── Archivos de media (metadata; blob binario en IDB separado) ─
-- Creado antes de cualquier tabla que lo referencia
CREATE TABLE IF NOT EXISTS media_files (
  id         TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL
             REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type       TEXT NOT NULL CHECK(type IN ('audio','photo','scan','document')),
  mime_type  TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  transcript TEXT,
  ocr_text   TEXT
);

-- ── Estado de la aplicación (singleton) ──────────────────────
CREATE TABLE IF NOT EXISTS app_state (
  id                 TEXT PRIMARY KEY DEFAULT 'main',
  active_profile_id  TEXT
                     REFERENCES profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  onboarding_done    INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_done IN (0,1)),
  agreement_accepted INTEGER NOT NULL DEFAULT 0 CHECK(agreement_accepted IN (0,1)),
  pin_hash           TEXT,
  auth_method        TEXT NOT NULL DEFAULT 'none'
                     CHECK(auth_method IN ('none','pin','biometric')),
  encryption_key     TEXT,
  ai_config          TEXT  -- JSON serializado de AIConfig
);

-- ── Alergias (1:N  profiles → allergies) ─────────────────────
CREATE TABLE IF NOT EXISTS allergies (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL
                REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  substance     TEXT NOT NULL,
  reaction      TEXT NOT NULL,
  severity      TEXT NOT NULL CHECK(severity IN ('mild','moderate','severe')),
  recorded_date TEXT NOT NULL
);

-- ── Vacunas (1:N  profiles → vaccines) ───────────────────────
CREATE TABLE IF NOT EXISTS vaccines (
  id         TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL
             REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name       TEXT NOT NULL,
  date       TEXT NOT NULL,
  dose       TEXT,
  next_date  TEXT
);

-- ── Diagnósticos (1:N  profiles → diagnoses) ─────────────────
CREATE TABLE IF NOT EXISTS diagnoses (
  id         TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL
             REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  condition  TEXT NOT NULL,
  icd_code   TEXT,
  onset_date TEXT NOT NULL,
  status     TEXT NOT NULL CHECK(status IN ('active','resolved','chronic')),
  notes      TEXT
);

-- ── Cirugías (1:N  profiles → surgeries) ─────────────────────
CREATE TABLE IF NOT EXISTS surgeries (
  id         TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL
             REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  procedure  TEXT NOT NULL,
  date       TEXT NOT NULL,
  hospital   TEXT,
  surgeon    TEXT,
  notes      TEXT
);

-- ── Antecedentes familiares (1:N  profiles → family_history) ──
CREATE TABLE IF NOT EXISTS family_history (
  id         TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL
             REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  relation   TEXT NOT NULL,
  condition  TEXT NOT NULL,
  notes      TEXT
);

-- ── Doctores (1:N  profiles → doctors) ───────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL
                REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name          TEXT NOT NULL,
  specialty     TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  notes         TEXT,
  audio_note_id TEXT
                REFERENCES media_files(id) ON DELETE SET NULL ON UPDATE CASCADE,
  rating        INTEGER CHECK(rating BETWEEN 1 AND 5),
  rating_notes  TEXT
);

-- ── doctor_diagnoses: M:N  doctors ↔ diagnoses ───────────────
-- Tabla pivote con PK compuesta y FK a ambas tablas padre
CREATE TABLE IF NOT EXISTS doctor_diagnoses (
  doctor_id    TEXT NOT NULL
               REFERENCES doctors(id) ON DELETE CASCADE ON UPDATE CASCADE,
  diagnosis_id TEXT NOT NULL
               REFERENCES diagnoses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (doctor_id, diagnosis_id)
);

-- ── doctor_media: M:N  doctors ↔ media_files ─────────────────
CREATE TABLE IF NOT EXISTS doctor_media (
  doctor_id TEXT NOT NULL
            REFERENCES doctors(id) ON DELETE CASCADE ON UPDATE CASCADE,
  media_id  TEXT NOT NULL
            REFERENCES media_files(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (doctor_id, media_id)
);

-- ── Medicamentos (1:N  profiles → medications) ───────────────
CREATE TABLE IF NOT EXISTS medications (
  id           TEXT PRIMARY KEY,
  profile_id   TEXT NOT NULL
               REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  diagnosis_id                TEXT
                              REFERENCES diagnoses(id) ON DELETE SET NULL ON UPDATE CASCADE,
  prescribing_doctor_id       TEXT
                              REFERENCES doctors(id) ON DELETE SET NULL ON UPDATE CASCADE,
  prescription_source         TEXT,   -- 'auto-medicado' | 'farmacéutico' | texto libre (sin doctor)
  prescribing_consultation_id TEXT
                              REFERENCES consultations(id) ON DELETE SET NULL ON UPDATE CASCADE,
  name         TEXT NOT NULL,
  dose         TEXT NOT NULL,
  frequency    TEXT NOT NULL,
  times        TEXT NOT NULL DEFAULT '[]',   -- JSON: string[]
  start_date   TEXT NOT NULL,
  end_date     TEXT,
  stock        INTEGER NOT NULL DEFAULT 0,
  stock_alert  INTEGER NOT NULL DEFAULT 5,
  notes        TEXT,
  last_taken   TEXT,
  rating       INTEGER CHECK(rating BETWEEN 1 AND 5)
);

-- ── Historial de toma (1:N  medications → medication_taken_history)
CREATE TABLE IF NOT EXISTS medication_taken_history (
  id            TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL
                REFERENCES medications(id) ON DELETE CASCADE ON UPDATE CASCADE,
  date          TEXT NOT NULL,
  time          TEXT NOT NULL,
  taken         INTEGER NOT NULL DEFAULT 0 CHECK(taken IN (0,1))
);

-- ── medication_media: M:N  medications ↔ media_files ─────────
CREATE TABLE IF NOT EXISTS medication_media (
  medication_id TEXT NOT NULL
                REFERENCES medications(id) ON DELETE CASCADE ON UPDATE CASCADE,
  media_id      TEXT NOT NULL
                REFERENCES media_files(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (medication_id, media_id)
);

-- ── Consultas (1:N  profiles → consultations) ────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL
                REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  doctor_id     TEXT
                REFERENCES doctors(id) ON DELETE SET NULL ON UPDATE CASCADE,
  date          TEXT NOT NULL,
  reason        TEXT NOT NULL,
  notes         TEXT NOT NULL DEFAULT '',
  audio_file_id TEXT
                REFERENCES media_files(id) ON DELETE SET NULL ON UPDATE CASCADE,
  summary       TEXT
);

-- ── Resultados de laboratorio (1:N  profiles → lab_results) ───
CREATE TABLE IF NOT EXISTS lab_results (
  id              TEXT PRIMARY KEY,
  profile_id      TEXT NOT NULL
                  REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  test_name       TEXT NOT NULL,
  date            TEXT NOT NULL,
  result          TEXT NOT NULL,
  unit            TEXT,
  reference_range TEXT,
  image_file_id   TEXT
                  REFERENCES media_files(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ── Citas médicas (1:N  profiles → appointments) ─────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               TEXT PRIMARY KEY,
  profile_id       TEXT NOT NULL
                   REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  doctor_id        TEXT
                   REFERENCES doctors(id) ON DELETE SET NULL ON UPDATE CASCADE,
  doctor_name      TEXT,  -- nombre desnormalizado: referencia histórica
  date             TEXT NOT NULL,
  time             TEXT NOT NULL,
  reason           TEXT NOT NULL,
  location         TEXT,
  reminder         INTEGER NOT NULL DEFAULT 0 CHECK(reminder IN (0,1)),
  reminder_minutes INTEGER NOT NULL DEFAULT 30,
  notes            TEXT
);

-- ── appointment_media: M:N  appointments ↔ media_files ────────
CREATE TABLE IF NOT EXISTS appointment_media (
  appointment_id TEXT NOT NULL
                 REFERENCES appointments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  media_id       TEXT NOT NULL
                 REFERENCES media_files(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (appointment_id, media_id)
);

-- ── Síntomas / diario (1:N  profiles → symptoms) ─────────────
CREATE TABLE IF NOT EXISTS symptoms (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL
                REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  date          TEXT NOT NULL,
  time          TEXT NOT NULL,
  pain_level    INTEGER NOT NULL DEFAULT 0 CHECK(pain_level BETWEEN 0 AND 3),
  description   TEXT NOT NULL,
  audio_file_id TEXT
                REFERENCES media_files(id) ON DELETE SET NULL ON UPDATE CASCADE,
  transcript    TEXT,
  photo_file_id TEXT
                REFERENCES media_files(id) ON DELETE SET NULL ON UPDATE CASCADE,
  tags          TEXT NOT NULL DEFAULT '[]'  -- JSON: string[]
);

-- ── Progreso / gamificación (1:1  profiles → progress) ───────
CREATE TABLE IF NOT EXISTS progress (
  profile_id      TEXT PRIMARY KEY
                  REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  streak          INTEGER NOT NULL DEFAULT 0,
  total_entries   INTEGER NOT NULL DEFAULT 0,
  last_entry_date TEXT NOT NULL DEFAULT '',
  suns            INTEGER NOT NULL DEFAULT 0,
  messages        TEXT NOT NULL DEFAULT '[]'  -- JSON: string[]
);

-- ── Tokens de compartir (1:N  profiles → share_tokens) ────────
CREATE TABLE IF NOT EXISTS share_tokens (
  token      TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL
             REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  expires_at TEXT NOT NULL,
  sections   TEXT NOT NULL DEFAULT '[]'  -- JSON: string[]
);

-- ── Proveedores de servicio (1:N  profiles → service_providers)
CREATE TABLE IF NOT EXISTS service_providers (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL
                REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL
                CHECK(category IN ('hospital','clinica','laboratorio','farmacia',
                                   'consultorio','centro_diagnostico','otro')),
  subcategory   TEXT,
  address       TEXT,
  phone         TEXT,
  website       TEXT,
  notes         TEXT,
  audio_note_id TEXT
                REFERENCES media_files(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ai_summary    TEXT,
  rating        INTEGER CHECK(rating BETWEEN 1 AND 5),
  rating_notes  TEXT,
  created_at    TEXT NOT NULL
);

-- ── provider_media: M:N  service_providers ↔ media_files ──────
CREATE TABLE IF NOT EXISTS provider_media (
  provider_id TEXT NOT NULL
              REFERENCES service_providers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  media_id    TEXT NOT NULL
              REFERENCES media_files(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (provider_id, media_id)
);

-- ── Exámenes médicos (1:N  profiles → medical_exams) ──────────
CREATE TABLE IF NOT EXISTS medical_exams (
  id              TEXT PRIMARY KEY,
  profile_id      TEXT NOT NULL
                  REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  doctor_id       TEXT
                  REFERENCES doctors(id) ON DELETE SET NULL ON UPDATE CASCADE,
  doctor_name     TEXT,
  provider_id     TEXT
                  REFERENCES service_providers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  provider_name   TEXT,
  category        TEXT NOT NULL
                  CHECK(category IN ('laboratorio','radiologia','procedimiento')),
  exam_type       TEXT NOT NULL,
  date            TEXT NOT NULL,
  status          TEXT NOT NULL
                  CHECK(status IN ('pendiente','en_proceso','completado','cancelado')),
  indication      TEXT,
  result          TEXT,
  interpretation  TEXT,
  user_notes      TEXT,
  audio_file_id   TEXT
                  REFERENCES media_files(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ai_summary      TEXT,
  rating          INTEGER CHECK(rating BETWEEN 1 AND 5),
  created_at      TEXT NOT NULL
);

-- ── exam_media: M:N  medical_exams ↔ media_files ──────────────
CREATE TABLE IF NOT EXISTS exam_media (
  exam_id  TEXT NOT NULL
           REFERENCES medical_exams(id) ON DELETE CASCADE ON UPDATE CASCADE,
  media_id TEXT NOT NULL
           REFERENCES media_files(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (exam_id, media_id)
);

-- ── Índices para consultas frecuentes ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_media_profile        ON media_files(profile_id);
CREATE INDEX IF NOT EXISTS idx_allergies_profile    ON allergies(profile_id);
CREATE INDEX IF NOT EXISTS idx_vaccines_profile     ON vaccines(profile_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_profile    ON diagnoses(profile_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_profile    ON surgeries(profile_id);
CREATE INDEX IF NOT EXISTS idx_fh_profile           ON family_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_doctors_profile      ON doctors(profile_id);
CREATE INDEX IF NOT EXISTS idx_meds_profile         ON medications(profile_id);
CREATE INDEX IF NOT EXISTS idx_meds_diagnosis       ON medications(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_meds_prescr_doctor  ON medications(prescribing_doctor_id);
CREATE INDEX IF NOT EXISTS idx_meds_prescr_consult ON medications(prescribing_consultation_id);
CREATE INDEX IF NOT EXISTS idx_taken_medication     ON medication_taken_history(medication_id);
CREATE INDEX IF NOT EXISTS idx_consults_profile     ON consultations(profile_id);
CREATE INDEX IF NOT EXISTS idx_consults_doctor      ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_profile          ON lab_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_appts_profile        ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_appts_date           ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appts_doctor         ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_profile     ON symptoms(profile_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_date        ON symptoms(date);
CREATE INDEX IF NOT EXISTS idx_tokens_profile       ON share_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_providers_profile    ON service_providers(profile_id);
CREATE INDEX IF NOT EXISTS idx_exams_profile        ON medical_exams(profile_id);
CREATE INDEX IF NOT EXISTS idx_exams_date           ON medical_exams(date);
CREATE INDEX IF NOT EXISTS idx_exams_doctor         ON medical_exams(doctor_id);
CREATE INDEX IF NOT EXISTS idx_exams_provider       ON medical_exams(provider_id);
`
