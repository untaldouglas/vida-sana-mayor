# Changelog – Vida Sana Mayor

Todos los cambios notables de este proyecto se documentan aquí.

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
Versiones: [Semantic Versioning](https://semver.org/lang/es/)

---

## [Unreleased]

> Añade aquí lo que ya está en `main` pero aún no tiene versión.

---

## [2.0.0] – 2026-03-31

### Cambio mayor (breaking)
- **Motor de base de datos: IndexedDB → SQLite WASM** – toda la capa de persistencia
  migrada a `sql.js` (SQLite compilado a WebAssembly), con `PRAGMA foreign_keys = ON`
  en cada conexión. Los datos de versiones anteriores (formato IndexedDB v2) requieren
  exportar respaldo (.vsm) antes de actualizar e importarlo tras la migración.

### Añadido
- **Integridad referencial a nivel de BD** – 21 tablas con `FOREIGN KEY` explícitas;
  nunca gestionada solo en código de aplicación
- **`ON DELETE CASCADE`** en todas las relaciones hijo↔padre: eliminar un perfil borra
  automáticamente todo su árbol de datos (diagnósticos, medicamentos, citas, médicos,
  exámenes, síntomas, media, etc.)
- **`ON DELETE SET NULL`** en referencias opcionales: `medications.diagnosis_id`,
  `appointments.doctor_id`, `consultations.doctor_id`, `medical_exams.doctor_id`,
  `medical_exams.provider_id`, etc. — la entidad dependiente permanece sin perder datos
- **6 tablas pivote M:N** con PK compuesta y FK a ambas tablas padre:
  `doctor_diagnoses`, `doctor_media`, `medication_media`, `appointment_media`,
  `exam_media`, `provider_media`
- **`CHECK` constraints** en todos los campos de tipo enumerado (severity, status, type,
  auth_method, category, etc.)
- **Validación en capa de servicio** (`assertExists`) antes de insertar FK opcionales
  (defensa en profundidad)
- **`src/db/schema.ts`** – DDL completo documentado con comentarios de cardinalidad
- **`src/db/database.ts`** – inicialización sql.js, `withTransaction`, `querySQL`, `runSQL`,
  helpers IDB para binary blobs
- **`src/vite-env.d.ts`** – tipos Vite/client para `import.meta.env`
- **WASM precacheado** por el service worker (`sql-wasm.wasm` en globPatterns)

### Arquitectura
- Binary blobs (audio, fotos) almacenados en IDB `vsm-blobs` separado por rendimiento;
  limpiados explícitamente antes del `DELETE` SQL (único punto fuera del FK scope)
- `withTransaction` garantiza atomicidad: `BEGIN / COMMIT / ROLLBACK + persistSQL()`
- Consistencia de tipos: todos los PK/FK son `TEXT` (UUID)

---

## [1.4.0] – 2026-03-25

### Añadido
- **Skills de Claude Code** (slash commands en `.claude/commands/`) – cuatro comandos
  que automatizan las tareas de desarrollo más repetitivas:
  - `/nueva-funcion <desc>` – implementa feature completa (types, storage, componente, App.tsx, build, commit)
  - `/publicar <versión>` – ciclo completo de release con validaciones y reporte de URLs
  - `/actualizar-docs` – audita y sincroniza README y CHANGELOG con el código real
  - `/estado` – snapshot instantáneo de versión, CI, Pages y siguiente acción sugerida
- **Conector MCP: GitHub** (`.mcp.json`) – extiende Claude Code con acceso nativo a la
  API de GitHub (crear issues, buscar código, gestionar PRs/releases) usando el token
  del `gh` CLI ya configurado, sin configuración adicional
- **Makefile targets**: `make skills-list`, `make skills-help`, `make mcp-test`, `make setup-dev`
- **docs/HERRAMIENTAS_IA.md** – guía completa de skills, MCP y plantillas para agregar nuevos

### Corregido
- Entrada duplicada `[1.3.0]` generada automáticamente por el script de release

### Infraestructura
- GitHub Actions: Node.js 20 → 24 (anticipando deprecación de junio 2026)
- `.gitignore`: skills del proyecto versionados, settings locales de Claude excluidos

---

## [1.3.0] – 2026-03-25

### Añadido
- **Módulo Exámenes Médicos** (`MedicalExams`) – gestión de laboratorios clínicos,
  radiología e imagen, y procedimientos especiales (PET, endoscopías, yodo radioactivo,
  colonoscopía, etc.) con +55 tipos predefinidos por categoría
- **Módulo Proveedores de Servicios Médicos** (`ServiceProviders`) – inventario de
  hospitales, clínicas, laboratorios, farmacias, consultorios y centros de diagnóstico
  con 7 categorías, filtros, teléfono de llamada directa y búsqueda
- **Sistema de calificaciones ⭐ (1-5)** para doctores, medicamentos, exámenes y
  proveedores; incluye campo de comentario en proveedores y doctores
- **Adjuntos enriquecidos** en exámenes y proveedores: nota de texto, grabación de voz
  (MediaRecorder), resumen generado por IA, fotos de documentos/radiografías (hasta 8)
- **Resumen inteligente por IA** en exámenes y proveedores mediante el proveedor
  configurado por el usuario (Ollama, Anthropic, OpenAI, Google, Mistral)
- **Vínculo doctor↔proveedor** en formulario de examen: selección cruzada desde listas
  ya registradas
- Nuevo tipo `'document'` en `MediaFile` para adjuntos multiformato
- IndexedDB v2: nuevas colecciones `medicalExams`, `serviceProviders`, `ratings`
- Respaldo cifrado `.vsm` ahora incluye exámenes y proveedores
- Limpieza automática de exámenes/proveedores al eliminar un perfil
- Filtros por categoría con contadores en ambos módulos
- Archivo `.tool-versions` para fijar versiones de herramientas (Node.js, GitHub CLI)

### Cambiado
- Menú "Más opciones" incluye acceso directo a Exámenes y Proveedores
- La detección de sección activa en el nav inferior cubre los nuevos módulos

---

## [1.2.0] – 2026-03-18

### Añadido
- Fotos en medicamentos (caja, receta, indicaciones) con galería y lightbox
- Fotos en doctores (credencial, consultorio, indicaciones)
- Fotos en citas médicas (resultados, indicaciones previas)
- Componente `ImagePicker` reutilizable con cámara, archivo, previews y eliminación
- Componente `ImageThumbs` para vista de miniaturas en solo lectura con lightbox

---

## [1.1.0] – 2026-03-10

### Añadido
- **Inteligencia Artificial opcional** – soporte para 5 proveedores: Ollama (local,
  gratuito), Anthropic Claude, OpenAI GPT, Google Gemini, Mistral AI
- `AISettings.tsx` – configuración de proveedor IA con selector de modelos y test de conexión
- `AIFeatureInfo.tsx` – componente informativo de funciones disponibles con IA
- `aiService.ts` – capa de servicio unificada para todos los proveedores de IA
- Aviso explícito y obligatorio de costos de IA en Acuerdo de uso y Onboarding
- Banner de configuración de IA en Dashboard
- Soporte de biometría (WebAuthn) como método de autenticación alternativo
- Campos de autoría, licencia y donativo (Ko-fi) en Configuración

### Cambiado
- Acuerdo de uso extendido con cláusula separada de responsabilidad de costos IA (punto 8)

---

## [1.0.0] – 2026-03-01

### Añadido
- **PWA offline 100%** – funciona sin internet, instalable en cualquier dispositivo
- **Multiperfil** – titular + perfiles familiares (esposa, hijo, cuidador, etc.)
- **Expediente clínico FHIR R4** – diagnósticos, alergias, vacunas, cirugías,
  antecedentes familiares, resultados de laboratorio
- **Medicamentos** – recordatorios por voz, inventario, alertas de stock, historial de toma
- **Agenda médica** – citas con doctores, vista semanal/lista, recordatorios
- **Doctores** – directorio con especialidades, teléfono, diagnósticos vinculados
- **Diario de síntomas** – escala de dolor, grabación de voz, transcripción, etiquetas
- **OCR de documentos** (Tesseract.js) en modo offline
- **Grabación de consultas** médicas con notas y resumen
- **Progreso y gamificación** – soles diarios, racha de días, hitos motivadores
- **Compartir temporal** – enlace QR de 24 horas, secciones seleccionables
- **Respaldo cifrado** AES-256-GCM en archivo `.vsm` protegido con PIN
- **Autenticación con PIN** de 4 dígitos + PBKDF2 (310,000 iteraciones, SHA-256)
- **Voz femenina en español** (es-MX) en toda la app
- **Acuerdo de uso** con lectura en voz alta antes de primer uso
- IndexedDB v1 con 8 colecciones (appState, medicalRecords, doctors, appointments,
  symptoms, progress, media, shareTokens)
- Diseño cálido (beige `#F5F0E1`, verde oliva `#8A9A5B`, amarillo sol `#F4C430`)
- Botones táctiles mínimos de 60 px para accesibilidad

---

[Unreleased]: https://github.com/untaldouglas/vida-sana-mayor/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/untaldouglas/vida-sana-mayor/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/untaldouglas/vida-sana-mayor/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/untaldouglas/vida-sana-mayor/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/untaldouglas/vida-sana-mayor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/untaldouglas/vida-sana-mayor/releases/tag/v1.0.0
